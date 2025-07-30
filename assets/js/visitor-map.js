// Visitor Map functionality using Leaflet.js
class VisitorMap {
    constructor(containerId) {
        this.containerId = containerId;
        this.map = null;
        this.markers = [];
        this.visitorData = [];
        
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
            
            // Load existing visitor data
            this.loadVisitorData();
            
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
                // Add marker to map
                this.addVisitorMarker(visitorInfo);
                
                // Save visitor data
                this.saveVisitorData(visitorInfo);
                
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

    saveVisitorData(visitorInfo) {
        // Get existing data from localStorage
        let existingData = [];
        try {
            const stored = localStorage.getItem('visitorMapData');
            if (stored) {
                existingData = JSON.parse(stored);
            }
        } catch (error) {
            console.error('Error loading stored visitor data:', error);
        }

        // Add new visitor data
        existingData.push(visitorInfo);
        
        // Keep only last 100 visitors to avoid storage issues
        if (existingData.length > 100) {
            existingData = existingData.slice(-100);
        }

        // Save back to localStorage
        try {
            localStorage.setItem('visitorMapData', JSON.stringify(existingData));
            this.visitorData = existingData;
        } catch (error) {
            console.error('Error saving visitor data:', error);
        }
    }

    loadVisitorData() {
        try {
            const stored = localStorage.getItem('visitorMapData');
            if (stored) {
                this.visitorData = JSON.parse(stored);
                
                // Add markers for existing visitors (limit to last 20 for performance)
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
}

// Initialize visitor map when page loads
document.addEventListener('DOMContentLoaded', function() {
    // Check if visitor map container exists
    const mapContainer = document.getElementById('visitor-map');
    if (mapContainer) {
        new VisitorMap('visitor-map');
    }
}); 