package com.bunny.nsd

import android.content.Context
import android.net.nsd.NsdManager
import android.net.nsd.NsdServiceInfo
import android.net.wifi.WifiManager
import android.util.Log
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

class NsdModule : Module() {
    private val context: Context
        get() = appContext.reactContext ?: throw Exception("React context is not available")

    private val nsdManager: NsdManager? by lazy {
        context.getSystemService(Context.NSD_SERVICE) as? NsdManager
    }

    private val wifiManager: WifiManager? by lazy {
        context.applicationContext.getSystemService(Context.WIFI_SERVICE) as? WifiManager
    }

    private var multicastLock: WifiManager.MulticastLock? = null

    private var registrationListener: NsdManager.RegistrationListener? = null
    private var discoveryListener: NsdManager.DiscoveryListener? = null

    private var registeredServiceName: String? = null
    private var isDiscovering = false

    override fun definition() = ModuleDefinition {
        Name("Nsd")

        Events(
            "onServiceRegistered",
            "onServiceUnregistered",
            "onRegistrationFailed",
            "onUnregistrationFailed",
            "onDiscoveryStarted",
            "onDiscoveryStopped",
            "onDiscoveryFailed",
            "onServiceResolved",
            "onServiceLost"
        )

        OnCreate {
            multicastLock = wifiManager?.createMulticastLock("NsdMulticastLock")?.apply {
                setReferenceCounted(true)
            }
        }

        OnDestroy {
            try {
                cleanUp()
            } catch (e: Exception) {
                Log.e("NsdModule", "Error during cleanup", e)
            }
        }

        AsyncFunction("registerService") { serviceName: String, port: Int ->
            val manager = nsdManager ?: throw Exception("NSD service not available")
            
            // If already registered, unregister first to avoid leaks
            if (registrationListener != null) {
                unregisterServiceInternal()
            }

            val serviceInfo = NsdServiceInfo().apply {
                this.serviceName = serviceName
                this.serviceType = "_musicparty._tcp"
                this.port = port
            }

            val listener = object : NsdManager.RegistrationListener {
                override fun onServiceRegistered(info: NsdServiceInfo) {
                    registeredServiceName = info.serviceName
                    sendEvent("onServiceRegistered", mapOf("serviceName" to info.serviceName))
                }

                override fun onRegistrationFailed(info: NsdServiceInfo, errorCode: Int) {
                    sendEvent("onRegistrationFailed", mapOf("errorCode" to errorCode))
                    registrationListener = null
                }

                override fun onServiceUnregistered(info: NsdServiceInfo) {
                    sendEvent("onServiceUnregistered", emptyMap<String, Any>())
                    registrationListener = null
                    registeredServiceName = null
                }

                override fun onUnregistrationFailed(info: NsdServiceInfo, errorCode: Int) {
                    sendEvent("onUnregistrationFailed", mapOf("errorCode" to errorCode))
                }
            }

            registrationListener = listener
            manager.registerService(serviceInfo, NsdManager.PROTOCOL_DNS_SD, listener)
            true
        }

        AsyncFunction("unregisterService") {
            unregisterServiceInternal()
            true
        }

        AsyncFunction("startDiscovery") { serviceType: String ->
            val manager = nsdManager ?: throw Exception("NSD service not available")

            if (isDiscovering) {
                stopDiscoveryInternal()
            }

            // Acquire multicast lock to make discovery stable on Android devices
            try {
                multicastLock?.acquire()
            } catch (e: Exception) {
                Log.e("NsdModule", "Failed to acquire multicast lock", e)
            }

            val listener = object : NsdManager.DiscoveryListener {
                override fun onStartDiscoveryFailed(type: String, errorCode: Int) {
                    sendEvent("onDiscoveryFailed", mapOf("errorCode" to errorCode))
                    stopDiscoveryInternal()
                }

                override fun onStopDiscoveryFailed(type: String, errorCode: Int) {
                    sendEvent("onDiscoveryFailed", mapOf("errorCode" to errorCode))
                    stopDiscoveryInternal()
                }

                override fun onDiscoveryStarted(type: String) {
                    isDiscovering = true
                    sendEvent("onDiscoveryStarted", mapOf("serviceType" to type))
                }

                override fun onDiscoveryStopped(type: String) {
                    isDiscovering = false
                    sendEvent("onDiscoveryStopped", mapOf("serviceType" to type))
                    releaseMulticastLock()
                }

                override fun onServiceFound(info: NsdServiceInfo) {
                    // Skip self-discovery to avoid confusion
                    if (info.serviceName == registeredServiceName) {
                        return
                    }
                    resolveServiceInternal(info)
                }

                override fun onServiceLost(info: NsdServiceInfo) {
                    sendEvent("onServiceLost", mapOf(
                        "serviceName" to info.serviceName,
                        "serviceType" to info.serviceType
                    ))
                }
            }

            discoveryListener = listener
            manager.discoverServices(serviceType, NsdManager.PROTOCOL_DNS_SD, listener)
            true
        }

        AsyncFunction("stopDiscovery") {
            stopDiscoveryInternal()
            true
        }
    }

    private fun unregisterServiceInternal() {
        val manager = nsdManager ?: return
        val listener = registrationListener ?: return
        try {
            manager.unregisterService(listener)
        } catch (e: Exception) {
            Log.e("NsdModule", "Error unregistering service", e)
        }
        registrationListener = null
        registeredServiceName = null
    }

    private fun stopDiscoveryInternal() {
        val manager = nsdManager ?: return
        val listener = discoveryListener ?: return
        try {
            manager.stopServiceDiscovery(listener)
        } catch (e: Exception) {
            Log.e("NsdModule", "Error stopping service discovery", e)
        }
        discoveryListener = null
        isDiscovering = false
        releaseMulticastLock()
    }

    private fun resolveServiceInternal(serviceInfo: NsdServiceInfo) {
        val manager = nsdManager ?: return
        val resolveListener = object : NsdManager.ResolveListener {
            override fun onResolveFailed(info: NsdServiceInfo, errorCode: Int) {
                Log.e("NsdModule", "Resolve failed for ${info.serviceName} with error code $errorCode")
            }

            override fun onServiceResolved(info: NsdServiceInfo) {
                val ip = info.host.hostAddress
                val port = info.port
                sendEvent("onServiceResolved", mapOf(
                    "serviceName" to info.serviceName,
                    "serviceType" to info.serviceType,
                    "ip" to ip,
                    "port" to port
                ))
            }
        }
        try {
            manager.resolveService(serviceInfo, resolveListener)
        } catch (e: Exception) {
            Log.e("NsdModule", "Error starting resolution: ${e.message}")
        }
    }

    private fun releaseMulticastLock() {
        try {
            if (multicastLock?.isHeld == true) {
                multicastLock?.release()
            }
        } catch (e: Exception) {
            Log.e("NsdModule", "Error releasing multicast lock", e)
        }
    }

    private fun cleanUp() {
        unregisterServiceInternal()
        stopDiscoveryInternal()
    }
}
