if ('serviceWorker' in navigator) {
    window.addEventListener('load', function() {
        navigator.serviceWorker.register('/sw.js', { scope: '/' }).then(function (registration) {
            console.log("ServiceWorker registration successful with scope: ", registration.scope)
        }).catch(function (err) {
            console.log("ServiceWorker registration failed: ", err)
        })

        window.addEventListener('appinstalled', function(e) {
            var msgChannel = new MessageChannel()
            msgChannel.port1.onmessage = function(event) {
                if (event.data === 'done') {
                    // sw is done caching
                    document.getElementById('sw-loading-icon').style.display = 'none'
                }
            }

            // Tell sw to start caching process, may take several seconds
            navigator.serviceWorker.controller.postMessage('appinstalled', [msgChannel.port2])
            document.getElementById('sw-loading-icon').style.display = 'block'
        })
    })
}
