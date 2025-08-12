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
            // Check if Leaflet is available
            if (typeof L === 'undefined') {
                console.warn('Leaflet.js not available, using fallback map');
                this.createFallbackMap();
                return;
            }

            // Initialize the map
            this.map = L.map(this.containerId).setView([35, 105], 4); // Center on China
            
            // Add map tiles - Using multiple tile providers for better China access
            const tileProviders = [
                {
                    name: 'CartoDB',
                    url: 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png',
                    attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors © <a href="https://carto.com/attributions">CARTO</a>'
                },
                {
                    name: 'OpenStreetMap',
                    url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
                    attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                },
                {
                    name: 'Esri',
                    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}',
                    attribution: 'Tiles © <a href="https://services.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer">Esri</a>'
                }
            ];

            // Try to add the first available tile layer
            let tileLayerAdded = false;
            for (const provider of tileProviders) {
                try {
                    L.tileLayer(provider.url, {
                        attribution: provider.attribution,
                        maxZoom: 18
                    }).addTo(this.map);
                    tileLayerAdded = true;
                    console.log(`Successfully loaded ${provider.name} tiles`);
                    break;
                } catch (error) {
                    console.warn(`Failed to load ${provider.name} tiles:`, error);
                    continue;
                }
            }

            if (!tileLayerAdded) {
                // Fallback: create a simple map without tiles
                console.warn('All tile providers failed, creating fallback map');
                this.createFallbackMap();
                return;
            }

            // Load existing visitor data from API
            await this.loadVisitorData();
            
            // Get current visitor's location and add to map
            await this.addCurrentVisitor();
            
        } catch (error) {
            console.error('Error initializing visitor map:', error);
            this.createFallbackMap();
        }
    }

    createFallbackMap() {
        // Create a simple fallback map when tile providers fail
        const mapContainer = document.getElementById(this.containerId);
        if (mapContainer) {
            mapContainer.innerHTML = `
                <div style="background: linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%); 
                            height: 100%; 
                            display: flex; 
                            align-items: center; 
                            justify-content: center; 
                            border-radius: 8px;
                            color: #2c3e50;
                            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                            position: relative;
                            overflow: hidden;">
                    
                    <!-- Simple world map background -->
                    <div style="position: absolute; 
                                top: 50%; 
                                left: 50%; 
                                transform: translate(-50%, -50%);
                                width: 80%; 
                                height: 60%; 
                                background: url('data:image/svg+xml,<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 1000 500\"><path d=\"M 100,200 Q 150,180 200,200 T 300,200 Q 350,220 400,200 T 500,200 Q 550,180 600,200 T 700,200 Q 750,220 800,200 T 900,200\" stroke=\"%23bdc3c7\" stroke-width=\"2\" fill=\"none\"/><path d=\"M 150,300 Q 200,280 250,300 T 350,300 Q 400,320 450,300 T 550,300 Q 600,280 650,300 T 750,300 Q 800,320 850,300\" stroke=\"%23bdc3c7\" stroke-width=\"2\" fill=\"none\"/><circle cx=\"200\" cy=\"150\" r=\"3\" fill=\"%23e74c3c\"/><circle cx=\"400\" cy=\"180\" r=\"3\" fill=\"%23e74c3c\"/><circle cx=\"600\" cy=\"160\" r=\"3\" fill=\"%23e74c3c\"/><circle cx=\"800\" cy=\"170\" r=\"3\" fill=\"%23e74c3c\"/></svg>') no-repeat center center;
                                background-size: contain;
                                opacity: 0.3;">
                    </div>
                    
                    <div style="text-align: center; z-index: 1; position: relative;">
                        <h3 style="margin: 0 0 10px 0; font-size: 24px;">🌍 Visitor Map</h3>
                        <p style="margin: 5px 0; font-size: 16px;">Map temporarily unavailable</p>
                        <p style="margin: 5px 0; font-size: 14px; color: #7f8c8d;">Please check your internet connection</p>
                        <div style="margin-top: 20px;">
                            <button onclick="location.reload()" style="
                                background: #3498db; 
                                color: white; 
                                border: none; 
                                padding: 10px 20px; 
                                border-radius: 5px; 
                                cursor: pointer;
                                font-size: 14px;">
                                🔄 Retry
                            </button>
                        </div>
                    </div>
                </div>
            `;
            
            // Try to get visitor location even without map
            this.addCurrentVisitor();
        }
    }

    async addCurrentVisitor() {
        try {
            // Get visitor's IP and location
            const visitorInfo = await this.getVisitorLocation();
            
            if (visitorInfo && visitorInfo.lat && visitorInfo.lng) {
                // Save visitor data to backend
                await this.saveVisitorData(visitorInfo);
                
                // Add marker to map if map is available
                if (this.map) {
                    this.addVisitorMarker(visitorInfo);
                } else {
                    // If no map, show visitor info in fallback
                    this.showVisitorInfo(visitorInfo);
                }
            }
        } catch (error) {
            console.error('Error adding current visitor:', error);
        }
    }

    showVisitorInfo(visitorInfo) {
        // Show visitor info in fallback mode
        const mapContainer = document.getElementById(this.containerId);
        if (mapContainer) {
            const visitorDiv = document.createElement('div');
            visitorDiv.style.cssText = `
                position: absolute;
                bottom: 20px;
                left: 20px;
                background: rgba(255, 255, 255, 0.9);
                padding: 10px;
                border-radius: 5px;
                font-size: 12px;
                color: #2c3e50;
                z-index: 10;
            `;
            visitorDiv.innerHTML = `
                <strong>📍 Current Visitor:</strong><br>
                ${visitorInfo.city}, ${visitorInfo.country}<br>
                <small>${new Date(visitorInfo.timestamp).toLocaleString()}</small>
            `;
            mapContainer.appendChild(visitorDiv);
        }
    }

    async getVisitorLocation() {
        try {
            // Try multiple IP geolocation APIs for better reliability
            const apis = [
                {
                    name: 'ipapi.co',
                    url: 'https://ipapi.co/json/',
                    parser: (data) => ({
                        lat: parseFloat(data.latitude),
                        lng: parseFloat(data.longitude),
                        city: data.city || 'Unknown',
                        country: data.country_name || 'Unknown',
                        ip: data.ip || 'Unknown',
                        timestamp: new Date().toISOString()
                    })
                },
                {
                    name: 'ipinfo.io',
                    url: 'https://ipinfo.io/json',
                    parser: (data) => {
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
                        return null;
                    }
                }
            ];

            // Try each API until one works
            for (const api of apis) {
                try {
                    console.log(`Trying ${api.name}...`);
                    const controller = new AbortController();
                    const timeoutId = setTimeout(() => controller.abort(), 3000); // 3 second timeout
                    
                    const response = await fetch(api.url, {
                        method: 'GET',
                        signal: controller.signal
                    });
                    
                    clearTimeout(timeoutId);
                    
                    if (response.ok) {
                        const data = await response.json();
                        const result = api.parser(data);
                        
                        if (result && result.lat && result.lng) {
                            console.log(`Successfully got location from ${api.name}`);
                            return result;
                        }
                    }
                } catch (error) {
                    console.warn(`Failed to get location from ${api.name}:`, error);
                    continue;
                }
            }

            // If all APIs fail, return a default location (China)
            console.warn('All IP geolocation APIs failed, using default location');
            return {
                lat: 35.8617,
                lng: 104.1954,
                city: 'Unknown',
                country: 'China',
                ip: 'Unknown',
                timestamp: new Date().toISOString()
            };
            
        } catch (error) {
            console.error('Error getting visitor location:', error);
            return null;
        }
    }

    addVisitorMarker(visitorInfo) {
        if (!this.map) return;

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
            
            // Add markers for visitors if map is available
            if (this.map) {
                this.visitorData.forEach(visitor => {
                    if (visitor.lat && visitor.lng) {
                        this.addVisitorMarker(visitor);
                    }
                });
            } else {
                // Show visitor count in fallback mode
                this.showVisitorCount();
            }
            
        } catch (error) {
            console.error('Error loading visitor data from API:', error);
            // Fallback to localStorage
            this.loadFromLocalStorage();
        }
    }

    showVisitorCount() {
        // Show visitor count in fallback mode
        const mapContainer = document.getElementById(this.containerId);
        if (mapContainer && this.visitorData.length > 0) {
            const countDiv = document.createElement('div');
            countDiv.style.cssText = `
                position: absolute;
                top: 20px;
                right: 20px;
                background: rgba(255, 255, 255, 0.9);
                padding: 10px;
                border-radius: 5px;
                font-size: 12px;
                color: #2c3e50;
                z-index: 10;
            `;
            countDiv.innerHTML = `
                <strong>👥 Total Visitors:</strong><br>
                ${this.visitorData.length} visitors<br>
                <small>from ${this.getUniqueCountries()} countries</small>
            `;
            mapContainer.appendChild(countDiv);
        }
    }

    getUniqueCountries() {
        const countries = new Set(this.visitorData.map(v => v.country).filter(c => c !== 'Unknown'));
        return countries.size;
    }

    loadFromLocalStorage() {
        try {
            const stored = localStorage.getItem('visitorMapData');
            if (stored) {
                this.visitorData = JSON.parse(stored);
                
                if (this.map) {
                    const recentVisitors = this.visitorData.slice(-20);
                    recentVisitors.forEach(visitor => {
                        if (visitor.lat && visitor.lng) {
                            this.addVisitorMarker(visitor);
                        }
                    });
                } else {
                    // Show visitor count in fallback mode
                    this.showVisitorCount();
                }
            }
        } catch (error) {
            console.error('Error loading visitor data:', error);
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