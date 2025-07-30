// Visitor Map functionality using Leaflet.js with backend API
class VisitorMap {
    constructor(containerId) {
        this.containerId = containerId;
        this.map = null;
        this.markers = [];
        this.visitorData = [];
        this.apiUrl = 'https://vercel-backend-9w0hni4ja-zhishuo-lius-projects.vercel.app/api/visitors';
        
        // Initialize map when DOM is loaded
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => this.init());
        } else {
            this.init();
        }
    }

    async init() {
        try {
            this.updateMapStatus('Initializing...');
            
            // Initialize the map
            this.map = L.map(this.containerId).setView([20, 0], 2);
            
            // Add OpenStreetMap tiles
            L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
                maxZoom: 18
            }).addTo(this.map);

            this.updateMapStatus('Loading visitor data...');
            
            // Load existing visitor data from API
            await this.loadVisitorData();
            
            // Get current visitor's location and add to map
            await this.addCurrentVisitor();
            
            this.updateMapStatus('Ready');
            
        } catch (error) {
            console.error('Error initializing visitor map:', error);
            this.updateMapStatus('Error loading map');
        }
    }

    updateMapStatus(status) {
        const statusElement = document.getElementById('map-status');
        if (statusElement) {
            statusElement.textContent = status;
            statusElement.className = 'stat-value';
            
            if (status === 'Loading...' || status === 'Initializing...' || status === 'Loading visitor data...') {
                statusElement.style.animation = 'pulse 1.5s infinite';
            } else if (status === 'Ready') {
                statusElement.style.animation = 'none';
                statusElement.style.color = '#27ae60';
            } else if (status === 'Error loading map') {
                statusElement.style.animation = 'none';
                statusElement.style.color = '#e74c3c';
            }
        }
    }

    async addCurrentVisitor() {
        try {
            this.updateMapStatus('Getting your location...');
            
            // Get visitor's IP and location
            const visitorInfo = await this.getVisitorLocation();
            
            if (visitorInfo && visitorInfo.lat && visitorInfo.lng) {
                // Save visitor data to backend
                await this.saveVisitorData(visitorInfo);
                
                // Add marker to map
                this.addVisitorMarker(visitorInfo);
                
                // Update visitor count
                this.updateVisitorCount();
                
                this.updateMapStatus('Location added!');
            } else {
                this.updateMapStatus('Location unavailable');
            }
        } catch (error) {
            console.error('Error adding current visitor:', error);
            this.updateMapStatus('Location error');
        }
    }

    async getVisitorLocation() {
        try {
            // Use ipapi.co for IP geolocation (free tier)
            const response = await fetch('https://ipapi.co/json/');
            const data = await response.json();
            
            if (data.latitude && data.longitude) {
                return {
                    lat: parseFloat(data.latitude),
                    lng: parseFloat(data.longitude),
                    city: data.city || 'Unknown',
                    country: data.country_name || 'Unknown',
                    ip: data.ip || 'Unknown',
                    timestamp: new Date().toISOString()
                };
            }
        } catch (error) {
            console.error('Error getting visitor location:', error);
            
            // Fallback: try alternative API
            try {
                const response = await fetch('https://ipinfo.io/json');
                const data = await response.json();
                
                if (data.loc) {
                    const [lat, lng] = data.loc.split(',').map(Number);
                    return {
                        lat: lat,
                        lng: lng,
                        city: data.city || 'Unknown',
                        country: data.country || 'Unknown',
                        ip: data.ip || 'Unknown',
                        timestamp: new Date().toISOString()
                    };
                }
            } catch (fallbackError) {
                console.error('Fallback API also failed:', fallbackError);
            }
        }
        
        return null;
    }

    addVisitorMarker(visitorInfo) {
        // Create custom icon for visitor marker
        const visitorIcon = L.divIcon({
            className: 'visitor-marker',
            html: '<div style="background-color: #ff6b6b; width: 12px; height: 12px; border-radius: 50%; border: 2px solid white; box-shadow: 0 2px 4px rgba(0,0,0,0.3);"></div>',
            iconSize: [12, 12],
            iconAnchor: [6, 6]
        });

        // Add marker to map
        const marker = L.marker([visitorInfo.lat, visitorInfo.lng], { icon: visitorIcon })
            .addTo(this.map);

        // Create popup content
        const popupContent = `
            <div class="visitor-popup">
                <h4>🌍 Visitor from ${visitorInfo.city}, ${visitorInfo.country}</h4>
                <p><strong>IP:</strong> ${visitorInfo.ip}</p>
                <p><strong>Time:</strong> ${new Date(visitorInfo.timestamp).toLocaleString()}</p>
            </div>
        `;

        marker.bindPopup(popupContent);
        this.markers.push(marker);
    }

    async saveVisitorData(visitorInfo) {
        try {
            const response = await fetch(this.apiUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(visitorInfo)
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const result = await response.json();
            console.log('Visitor data saved:', result);
            
        } catch (error) {
            console.error('Error saving visitor data to backend:', error);
            // Fallback to localStorage if backend fails
            this.saveToLocalStorage(visitorInfo);
        }
    }

    saveToLocalStorage(visitorInfo) {
        // Fallback method using localStorage
        let existingData = [];
        try {
            const stored = localStorage.getItem('visitorMapData');
            if (stored) {
                existingData = JSON.parse(stored);
            }
        } catch (error) {
            console.error('Error loading stored visitor data:', error);
        }

        existingData.push(visitorInfo);
        
        if (existingData.length > 100) {
            existingData = existingData.slice(-100);
        }

        try {
            localStorage.setItem('visitorMapData', JSON.stringify(existingData));
            this.visitorData = existingData;
        } catch (error) {
            console.error('Error saving visitor data:', error);
        }
    }

    async loadVisitorData() {
        try {
            const response = await fetch(`${this.apiUrl}?limit=50`);
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();
            this.visitorData = data.visitors;
            
            // Update stats
            this.updateStats(data.stats);
            
            // Add markers for visitors
            this.visitorData.forEach(visitor => {
                if (visitor.lat && visitor.lng) {
                    this.addVisitorMarker(visitor);
                }
            });
            
        } catch (error) {
            console.error('Error loading visitor data from API:', error);
            // Fallback to localStorage
            this.loadFromLocalStorage();
        }
    }

    loadFromLocalStorage() {
        try {
            const stored = localStorage.getItem('visitorMapData');
            if (stored) {
                this.visitorData = JSON.parse(stored);
                
                const recentVisitors = this.visitorData.slice(-20);
                recentVisitors.forEach(visitor => {
                    if (visitor.lat && visitor.lng) {
                        this.addVisitorMarker(visitor);
                    }
                });
            }
        } catch (error) {
            console.error('Error loading visitor data:', error);
        }
    }

    updateVisitorCount() {
        const countElement = document.getElementById('visitor-count');
        if (countElement) {
            countElement.textContent = this.visitorData.length;
        }
    }

    updateStats(stats) {
        const countElement = document.getElementById('visitor-count');
        if (countElement && stats) {
            countElement.textContent = stats.total;
        }
        
        // Add more stats if needed
        const statsContainer = document.querySelector('.visitor-stats');
        if (statsContainer && stats) {
            // Add countries and cities stats if they don't exist
            if (!document.getElementById('countries-count')) {
                const countriesItem = document.createElement('div');
                countriesItem.className = 'stat-item';
                countriesItem.innerHTML = `
                    <span class="stat-label">Countries:</span>
                    <span class="stat-value" id="countries-count">${stats.countries}</span>
                `;
                statsContainer.appendChild(countriesItem);
            }
            
            if (!document.getElementById('cities-count')) {
                const citiesItem = document.createElement('div');
                citiesItem.className = 'stat-item';
                citiesItem.innerHTML = `
                    <span class="stat-label">Cities:</span>
                    <span class="stat-value" id="cities-count">${stats.cities}</span>
                `;
                statsContainer.appendChild(citiesItem);
            }
        }
    }
}

// Initialize visitor map when page loads
document.addEventListener('DOMContentLoaded', function() {
    // Check if visitor map container exists
    const mapContainer = document.getElementById('visitor-map');
    if (mapContainer) {
        new VisitorMap('visitor-map');
    }
}); 