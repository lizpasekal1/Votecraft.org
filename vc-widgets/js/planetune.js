/**
 * Planetune.up React Component
 * Location-based music discovery app
 */

// Icon component wrapper for Lucide icons
const Icon = ({ name, className = "", size = 24, strokeWidth = 2, fill = "none" }) => {
    const ref = React.useRef(null);

    React.useEffect(() => {
        if (ref.current && window.lucide) {
            ref.current.innerHTML = '';
            const iconElement = document.createElement('i');
            iconElement.setAttribute('data-lucide', name);
            ref.current.appendChild(iconElement);
            window.lucide.createIcons({ icons: { [name]: window.lucide.icons[name] }, nodes: [iconElement] });

            const svg = ref.current.querySelector('svg');
            if (svg) {
                svg.setAttribute('width', size);
                svg.setAttribute('height', size);
                svg.setAttribute('stroke-width', strokeWidth);
                if (fill !== "none") {
                    svg.setAttribute('fill', fill);
                }
                if (className) {
                    className.split(' ').forEach(c => svg.classList.add(c));
                }
            }
        }
    }, [name, className, size, strokeWidth, fill]);

    return <span ref={ref} className="inline-flex items-center justify-center" />;
};

const PlanetTuneApp = () => {
    const [selectedPin, setSelectedPin] = React.useState(null);
    const [sortedPlaylists, setSortedPlaylists] = React.useState([]);
    const [showPlasticSaversPopup, setShowPlasticSaversPopup] = React.useState(false);
    const [showSearchPopup, setShowSearchPopup] = React.useState(false);
    const [showPostTypeDropdown, setShowPostTypeDropdown] = React.useState(false);
    const [showPlaylistDetail, setShowPlaylistDetail] = React.useState(false);
    const [selectedPlaylistDetail, setSelectedPlaylistDetail] = React.useState(null);
    const [showProfile, setShowProfile] = React.useState(false);

    // Use playlists from external data file
    const playlists = PLANETUNE_PLAYLISTS;

    // Initialize sorted playlists
    React.useEffect(() => {
        setSortedPlaylists(playlists);
    }, []);

    const handlePinClick = (playlistId) => {
        setSelectedPin(playlistId);
        // Move selected playlist to top
        const selected = playlists.find(p => p.id === playlistId);
        const others = playlists.filter(p => p.id !== playlistId);
        setSortedPlaylists([selected, ...others]);
    };

    const handleAddressClick = (playlistId) => {
        // Only highlight the pin, don't reorder
        setSelectedPin(playlistId);
    };

    return (
        <div className="max-w-2xl mx-auto bg-black min-h-screen">
            {/* Top Bar */}
            <div className="bg-white px-4 py-2 flex items-center justify-between shadow-sm">
                <div className="flex items-center gap-2">
                    <div className="w-10 h-10 bg-green-500 rounded-full flex items-center justify-center">
                        <Icon name="music" size={24} className="text-white" />
                    </div>
                    <div className="text-xl font-bold">
                        <span className="text-green-600">Planetune</span>
                        <span className="text-blue-500">.up</span>
                    </div>
                </div>
                <button className="p-2 hover:bg-gray-100 rounded-lg">
                    <Icon name="menu" size={20} className="text-gray-600" />
                </button>
            </div>

            {/* Map Section */}
            <div className="relative overflow-hidden bg-yellow-100 sticky top-0 z-10 sticky-map" style={{ height: 'calc(40vh - 48px)' }}>
                <div className="w-full h-full flex items-center justify-center text-gray-300">
                    <Icon name="map-pin" size={256} className="opacity-10" />
                </div>
                <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-gray-500 text-lg font-medium">New York City Map</span>
                </div>

                {/* Zoom Controls */}
                <div className="absolute left-3 top-3 bg-white rounded-lg shadow-lg overflow-hidden z-20">
                    <button className="px-4 py-3 border-b border-gray-200 hover:bg-gray-50 text-gray-700 font-bold text-lg block w-full">
                        +
                    </button>
                    <button className="px-4 py-3 hover:bg-gray-50 text-gray-700 font-bold text-lg block w-full">
                        -
                    </button>
                </div>

                {/* Map Pins */}
                <div className="absolute inset-0">
                    {playlists.map((playlist, idx) => (
                        <button
                            key={playlist.id}
                            onClick={() => handlePinClick(playlist.id)}
                            className="absolute z-10 map-pin"
                            style={{
                                left: `${35 + (idx * 20)}%`,
                                top: `${35 + (idx * 15)}%`,
                                transform: 'translate(-50%, -100%)'
                            }}
                        >
                            {/* Callout bubble */}
                            {selectedPin === playlist.id && (
                                <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 bg-white px-3 py-2 rounded-lg shadow-lg whitespace-nowrap callout-bubble">
                                    <div className="text-xs font-medium text-gray-800">{playlist.location}</div>
                                    <div className="absolute top-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-white"></div>
                                </div>
                            )}
                            <Icon
                                name="map-pin"
                                size={48}
                                fill="currentColor"
                                className={`drop-shadow-xl transition-all ${
                                    selectedPin === playlist.id
                                        ? 'text-blue-500 scale-125'
                                        : 'text-green-500 hover:scale-110'
                                }`}
                            />
                        </button>
                    ))}
                </div>
            </div>

            {/* Playlist List */}
            <div className="bg-black px-4 py-6 overflow-y-auto playlist-scroll">
                <h2 className="text-white text-lg font-bold mb-6">New York Playlists</h2>

                {sortedPlaylists.map((playlist) => (
                    <div
                        key={playlist.id}
                        id={`playlist-${playlist.id}`}
                        className={`bg-gray-800 rounded-xl overflow-hidden mb-3 shadow-lg flex transition-all h-28 playlist-card ${
                            selectedPin === playlist.id ? 'ring-2 ring-blue-500' : ''
                        }`}
                    >
                        {/* Featured Image - Left side */}
                        <div className="w-28 flex-shrink-0 bg-gradient-to-br from-gray-200 to-white relative">
                            {playlist.hasPlasticSavers && (
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        setShowPlasticSaversPopup(true);
                                    }}
                                    className="absolute top-2 right-2 w-7 h-7 bg-green-500 rounded-full flex items-center justify-center hover:bg-green-600 transition-colors"
                                >
                                    <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 24 24">
                                        <path d="M21.8 15.2l-2.2-3.8 1.4-2.4c.4-.7.2-1.6-.5-2l-1.9-1.1c-.7-.4-1.6-.2-2 .5l-1.4 2.4L12 7.2c-.8-.4-1.7-.4-2.4 0l-1.9 1.1-1.4-2.4c-.4-.7-1.3-.9-2-.5L2.4 6.5c-.7.4-.9 1.3-.5 2l1.4 2.4-2.2 3.8c-.4.7-.2 1.6.5 2l1.9 1.1c.3.2.6.2.9.2.5 0 1-.3 1.2-.7l1.4-2.4 3.2 1.8c.4.2.8.3 1.2.3s.8-.1 1.2-.3l3.2-1.8 1.4 2.4c.2.4.7.7 1.2.7.3 0 .6-.1.9-.2l1.9-1.1c.7-.4.9-1.3.5-2z"/>
                                    </svg>
                                </button>
                            )}
                        </div>

                        {/* Content - Right side */}
                        <div className="flex-1 flex flex-col p-3 min-w-0 justify-between">
                            <div>
                                <h3 className="text-white text-sm font-bold mb-0.5 truncate leading-tight">{playlist.name}</h3>
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        handleAddressClick(playlist.id);
                                    }}
                                    className="text-left w-full"
                                >
                                    <p className={`text-xs mb-1.5 hover:text-green-400 transition-colors cursor-pointer truncate leading-tight ${
                                        selectedPin === playlist.id ? 'text-green-500' : 'text-gray-400'
                                    }`}>
                                        {playlist.location}
                                    </p>
                                </button>

                                {/* Creator Profile */}
                                <div className="flex items-center gap-1.5">
                                    <div className="w-5 h-5 rounded-full bg-gray-700 flex items-center justify-center flex-shrink-0">
                                        <Icon name="user" size={12} className="text-gray-400" />
                                    </div>
                                    <span className="text-white text-xs font-medium truncate leading-tight">{playlist.creator}</span>
                                </div>
                            </div>

                            {/* Action Icons */}
                            <div className="flex items-center gap-3">
                                <button className="flex items-center gap-1 text-white">
                                    <Icon name="heart" size={16} />
                                    <span className="text-xs font-semibold">{playlist.likes}</span>
                                </button>
                                <button className="text-white">
                                    <Icon name="message-circle" size={16} />
                                </button>
                                <button className="text-white">
                                    <Icon name="share-2" size={16} />
                                </button>
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        setSelectedPlaylistDetail(playlist);
                                        setShowPlaylistDetail(true);
                                    }}
                                    className="w-7 h-7 bg-green-500 rounded-full flex items-center justify-center hover:bg-green-600 transition-all shadow-lg ml-auto flex-shrink-0 play-button"
                                >
                                    <Icon name="play" size={16} fill="currentColor" className="text-white ml-0.5" />
                                </button>
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {/* Bottom Navigation */}
            <div className="fixed bottom-0 left-0 right-0 bg-gray-900 border-t border-gray-800 flex justify-around py-2 max-w-2xl mx-auto bottom-nav">
                <button className="p-2 text-gray-500">
                    <Icon name="home" size={32} strokeWidth={2} />
                </button>
                <button
                    onClick={() => setShowSearchPopup(true)}
                    className="p-2 text-gray-500"
                >
                    <Icon name="search" size={32} strokeWidth={2} />
                </button>
                <button className="p-2 text-gray-500">
                    <Icon name="plus" size={32} strokeWidth={2} />
                </button>
                <button
                    onClick={() => setShowProfile(true)}
                    className="p-2 text-gray-500"
                >
                    <Icon name="user" size={32} strokeWidth={2} />
                </button>
            </div>

            {/* Plastic Savers Popup */}
            {showPlasticSaversPopup && (
                <div className="fixed inset-0 bg-black bg-opacity-70 z-50 flex items-center justify-center p-4 modal-backdrop">
                    <div className="bg-green-500 rounded-2xl max-w-sm w-full p-6 relative modal-content">
                        <button
                            onClick={() => setShowPlasticSaversPopup(false)}
                            className="absolute top-3 right-3 text-white hover:bg-green-600 p-1 rounded-full transition-colors"
                        >
                            <Icon name="x" size={20} strokeWidth={2.5} />
                        </button>

                        <div className="flex items-center gap-3 mb-4">
                            <div className="text-3xl">recycle</div>
                            <h2 className="text-white text-xl font-bold leading-tight">Plastic Savers Initiative</h2>
                        </div>

                        <p className="text-white text-sm leading-relaxed mb-5">
                            This user is encouraging people to be plastic savers! Bring your own water bottles, containers, bags, and utensils. They encourage people to share selfies in this location with their plastic saver items.
                        </p>

                        <button
                            onClick={() => setShowPlasticSaversPopup(false)}
                            className="w-full bg-white text-green-600 font-bold py-3 rounded-full hover:bg-gray-100 transition-colors text-base"
                        >
                            Check it out
                        </button>
                    </div>
                </div>
            )}

            {/* Search Popup */}
            {showSearchPopup && (
                <div
                    className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-3 modal-backdrop"
                    onClick={() => setShowSearchPopup(false)}
                >
                    <div
                        className="bg-white rounded-3xl max-w-md w-full max-h-[80vh] flex flex-col modal-content"
                        onClick={(e) => e.stopPropagation()}
                    >
                        {/* Fixed Header */}
                        <div className="flex-shrink-0 p-4 pb-2 relative">
                            <button
                                onClick={() => setShowSearchPopup(false)}
                                className="absolute top-3 right-3 text-gray-600 hover:bg-gray-100 p-1 rounded-full transition-colors"
                            >
                                <Icon name="x" size={16} />
                            </button>
                            <h2 className="text-black text-base font-bold">Search Playlists</h2>
                        </div>

                        {/* Scrollable Content */}
                        <div className="overflow-y-auto flex-1 px-4">
                            <div className="space-y-3 pb-4">
                                <div className="flex items-center gap-2">
                                    <label className="text-black font-semibold text-xs w-20 flex-shrink-0">Location</label>
                                    <input
                                        type="text"
                                        placeholder="e.g., London"
                                        className="flex-1 bg-gray-100 text-black px-2 py-2 rounded-lg border-0 placeholder-gray-400 text-xs"
                                    />
                                </div>

                                <div className="flex items-center gap-2">
                                    <label className="text-black font-semibold text-xs w-20 flex-shrink-0">Post Type</label>
                                    <div className="relative flex-1">
                                        <button
                                            onClick={() => setShowPostTypeDropdown(!showPostTypeDropdown)}
                                            className="w-full bg-gray-100 text-black px-2 py-2 rounded-lg flex items-center justify-between hover:bg-gray-200 transition-colors text-xs"
                                        >
                                            <span>All</span>
                                            <svg className="w-3 h-3 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                            </svg>
                                        </button>
                                        {showPostTypeDropdown && (
                                            <div className="absolute top-full left-0 right-0 mt-1 bg-white rounded-lg overflow-hidden z-10 shadow-xl border border-gray-200">
                                                <label className="flex items-start gap-2 px-2 py-1.5 hover:bg-gray-50 cursor-pointer">
                                                    <input type="checkbox" defaultChecked className="w-3 h-3 mt-0.5 rounded" />
                                                    <div>
                                                        <p className="text-black font-semibold text-xs">Major Artists</p>
                                                        <p className="text-gray-500" style={{fontSize: '10px'}}>Curated playlists by us</p>
                                                    </div>
                                                </label>
                                                <label className="flex items-start gap-2 px-2 py-1.5 hover:bg-gray-50 cursor-pointer">
                                                    <input type="checkbox" defaultChecked className="w-3 h-3 mt-0.5 rounded" />
                                                    <div>
                                                        <p className="text-black font-semibold text-xs">Sponsored</p>
                                                        <p className="text-gray-500" style={{fontSize: '10px'}}>Playlists by local shops</p>
                                                    </div>
                                                </label>
                                                <label className="flex items-start gap-2 px-2 py-1.5 hover:bg-gray-50 cursor-pointer">
                                                    <input type="checkbox" defaultChecked className="w-3 h-3 mt-0.5 rounded" />
                                                    <div>
                                                        <p className="text-black font-semibold text-xs">Following</p>
                                                        <p className="text-gray-500" style={{fontSize: '10px'}}>Your linked friends</p>
                                                    </div>
                                                </label>
                                                <label className="flex items-start gap-2 px-2 py-1.5 hover:bg-gray-50 cursor-pointer">
                                                    <input type="checkbox" defaultChecked className="w-3 h-3 mt-0.5 rounded" />
                                                    <div>
                                                        <p className="text-black font-semibold text-xs">Community</p>
                                                        <p className="text-gray-500" style={{fontSize: '10px'}}>Anyone posting</p>
                                                    </div>
                                                </label>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                <div className="flex items-center gap-2">
                                    <label className="text-black font-semibold text-xs w-20 flex-shrink-0">Mood</label>
                                    <select className="flex-1 bg-gray-100 text-gray-900 px-2 py-2 rounded-lg border-0 text-xs">
                                        <option>Select a mood</option>
                                        <option>Energetic</option>
                                        <option>Chill</option>
                                        <option>Romantic</option>
                                    </select>
                                </div>

                                <div className="flex items-center gap-2">
                                    <label className="text-black font-semibold text-xs w-20 flex-shrink-0">Genre</label>
                                    <select className="flex-1 bg-gray-100 text-gray-900 px-2 py-2 rounded-lg border-0 text-xs">
                                        <option>Select a genre</option>
                                        <option>Jazz</option>
                                        <option>Rock</option>
                                        <option>Electronic</option>
                                    </select>
                                </div>

                                <div className="flex items-center gap-2">
                                    <label className="text-black font-semibold text-xs w-20 flex-shrink-0">Date Posted</label>
                                    <button className="flex-1 bg-gray-100 text-gray-500 px-2 py-2 rounded-lg flex items-center gap-2 hover:bg-gray-200 transition-colors text-xs">
                                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                        </svg>
                                        <span>Pick a date</span>
                                    </button>
                                </div>

                                <div className="flex items-center gap-2">
                                    <label className="text-black font-semibold text-xs w-20 flex-shrink-0">User Name</label>
                                    <input
                                        type="text"
                                        placeholder="e.g., dj_mimo"
                                        className="flex-1 bg-gray-100 text-black px-2 py-2 rounded-lg border-0 placeholder-gray-400 text-xs"
                                    />
                                </div>

                                <div className="flex justify-center">
                                    <button
                                        onClick={() => setShowSearchPopup(false)}
                                        className="w-1/2 bg-black text-white font-bold py-2 rounded-full hover:bg-gray-800 transition-colors text-xs mt-2"
                                    >
                                        Search
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Playlist Detail Screen */}
            {showPlaylistDetail && selectedPlaylistDetail && (
                <div className="fixed inset-0 bg-black z-50 flex flex-col max-w-2xl mx-auto">
                    <div className="bg-white px-4 py-2 flex items-center justify-between shadow-sm flex-shrink-0">
                        <div className="flex items-center gap-2">
                            <div className="w-10 h-10 bg-green-500 rounded-full flex items-center justify-center">
                                <Icon name="music" size={24} className="text-white" />
                            </div>
                            <div className="text-xl font-bold">
                                <span className="text-green-600">Planetune</span>
                                <span className="text-blue-500">.up</span>
                            </div>
                        </div>
                    </div>

                    <div className="flex-1 overflow-y-auto pb-20 px-4 pt-4">
                        <button
                            onClick={() => setShowPlaylistDetail(false)}
                            className="flex items-center gap-2 text-white mb-4 px-4 py-2 border border-gray-700 rounded-xl hover:bg-gray-800 transition-colors"
                        >
                            <span>back</span>
                            <span className="text-sm">Back to Home</span>
                        </button>

                        <div className="flex items-center gap-3 mb-4">
                            <div className="w-16 h-16 rounded-full bg-gray-700 flex items-center justify-center">
                                <Icon name="user" size={32} className="text-gray-400" />
                            </div>
                            <div>
                                <h1 className="text-white text-xl font-bold leading-tight">{selectedPlaylistDetail.name}</h1>
                                <p className="text-gray-400 text-sm">by {selectedPlaylistDetail.creator}</p>
                            </div>
                        </div>

                        <p className="text-gray-300 text-sm leading-relaxed mb-1">{selectedPlaylistDetail.description}</p>
                        <button className="text-green-500 font-semibold text-sm mb-4 flex items-center gap-1">
                            Show more
                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                            </svg>
                        </button>

                        <div className="bg-gray-900 rounded-xl p-4">
                            <h2 className="text-white text-lg font-bold mb-3">Tracklist</h2>
                            <div className="bg-gray-800 rounded-lg p-4 mb-3">
                                <p className="text-gray-400 text-xs mb-2">Linked from Spotify</p>
                                <div className="space-y-2">
                                    {selectedPlaylistDetail.tracks && selectedPlaylistDetail.tracks.map((track, idx) => (
                                        <div key={idx} className="flex items-center gap-3 py-2">
                                            <div className="w-8 h-8 bg-gray-700 rounded flex items-center justify-center flex-shrink-0">
                                                <Icon name="music" size={16} className="text-gray-500" />
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className="text-white font-semibold text-sm truncate">{track.name}</p>
                                                <p className="text-gray-400 text-xs truncate">{track.artist}</p>
                                            </div>
                                            <button className="text-green-500 hover:text-green-400">
                                                <Icon name="play" size={16} fill="currentColor" />
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            </div>
                            <p className="text-gray-500 text-xs text-center">
                                Note: In production, users would paste their Spotify/Apple Music playlist URL here to embed the actual player
                            </p>
                        </div>
                    </div>
                </div>
            )}

            {/* Profile Screen */}
            {showProfile && (
                <div className="fixed inset-0 bg-gray-900 z-50 flex flex-col max-w-2xl mx-auto">
                    <div className="bg-white px-4 py-2 flex items-center justify-between shadow-sm flex-shrink-0">
                        <div className="flex items-center gap-2">
                            <div className="w-10 h-10 bg-green-500 rounded-full flex items-center justify-center">
                                <Icon name="music" size={24} className="text-white" />
                            </div>
                            <div className="text-xl font-bold">
                                <span className="text-green-600">Planetune</span>
                                <span className="text-blue-500">.up</span>
                            </div>
                        </div>
                        <button
                            onClick={() => setShowProfile(false)}
                            className="text-gray-600 hover:bg-gray-100 p-2 rounded-full"
                        >
                            <Icon name="x" size={20} />
                        </button>
                    </div>

                    <div className="flex-1 overflow-y-auto pb-20">
                        <div className="flex flex-col items-center pt-8 pb-6">
                            <div className="w-32 h-32 rounded-full bg-gray-700 flex items-center justify-center mb-4">
                                <Icon name="user" size={64} className="text-gray-400" />
                            </div>
                            <h2 className="text-white text-3xl font-bold mb-2">DJ Groove</h2>
                            <p className="text-gray-400 text-sm">Profile data from Instagram.</p>
                        </div>

                        <div className="px-4 space-y-4">
                            <div className="bg-gray-800 rounded-2xl p-5">
                                <div className="flex items-center gap-3 mb-3">
                                    <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 24 24">
                                        <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
                                    </svg>
                                    <h3 className="text-white text-lg font-bold">Instagram Account</h3>
                                </div>
                                <p className="text-gray-400 mb-4 text-sm leading-relaxed">
                                    Link your Instagram to sync your profile and share photos on your playlists.
                                </p>
                                <div className="flex items-center gap-2 text-green-500">
                                    <div className="w-5 h-5 rounded-full border-2 border-green-500 flex items-center justify-center">
                                        <span className="text-xs">check</span>
                                    </div>
                                    <span className="font-semibold text-sm">Account Linked</span>
                                </div>
                            </div>

                            <div className="bg-gray-800 rounded-2xl p-5">
                                <div className="flex items-center gap-3 mb-3">
                                    <Icon name="music" size={24} className="text-white" />
                                    <h3 className="text-white text-lg font-bold">Spotify Account</h3>
                                </div>
                                <p className="text-gray-400 mb-4 text-sm leading-relaxed">
                                    Link your Spotify to feature your favorite tracks.
                                </p>
                                <div className="flex items-center gap-2 text-green-500">
                                    <div className="w-5 h-5 rounded-full border-2 border-green-500 flex items-center justify-center">
                                        <span className="text-xs">check</span>
                                    </div>
                                    <span className="font-semibold text-sm">Account Linked</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
