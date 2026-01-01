package com.safenest.app.falldetection

import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.Service
import android.content.Context
import android.content.Intent
import android.hardware.Sensor
import android.hardware.SensorEvent
import android.hardware.SensorEventListener
import android.hardware.SensorManager
import android.os.IBinder
import android.os.SharedMemory
import androidx.core.app.NotificationCompat
import kotlin.math.sqrt
import kotlin.math.abs

// Enhanced fall detection with sensor fusion (accelerometer + gyroscope + pressure)
class FallDetectionService : Service(), SensorEventListener {
    private lateinit var sensorManager: SensorManager
    private var accelSensor: Sensor? = null
    private var gyroSensor: Sensor? = null
    private var pressureSensor: Sensor? = null

    // Sensitivity levels: LOW, MEDIUM, HIGH
    private var sensitivityLevel = "MEDIUM"

    // Thresholds based on sensitivity
    private var impactThreshold = 22.0f // m/s^2
    private var rotationThreshold = 200.0f // degrees/second
    private var inactivityWindowMs = 2500L

    // Sensor data buffers
    private val accelBuffer = FloatArray(3)
    private val gyroBuffer = FloatArray(3)
    private var lastPressure = 0f
    private var pressureDropped = false

    private var lastImpactTime = 0L
    private var lastFallTime = 0L
    private val fallCooldownMs = 5000L // 5 second cooldown between falls

    override fun onCreate() {
        super.onCreate()
        sensorManager = getSystemService(Context.SENSOR_SERVICE) as SensorManager
        
        // Get all sensors
        accelSensor = sensorManager.getDefaultSensor(Sensor.TYPE_ACCELEROMETER)
        gyroSensor = sensorManager.getDefaultSensor(Sensor.TYPE_GYROSCOPE)
        pressureSensor = sensorManager.getDefaultSensor(Sensor.TYPE_PRESSURE)

        // Load sensitivity preference
        loadSensitivityLevel()
        
        startForegroundWithNotification()
        
        // Register all available sensors
        accelSensor?.also {
            sensorManager.registerListener(this, it, SensorManager.SENSOR_DELAY_GAME)
        }
        gyroSensor?.also {
            sensorManager.registerListener(this, it, SensorManager.SENSOR_DELAY_GAME)
        }
        pressureSensor?.also {
            sensorManager.registerListener(this, it, SensorManager.SENSOR_DELAY_NORMAL)
        }
    }

    override fun onDestroy() {
        sensorManager.unregisterListener(this)
        super.onDestroy()
    }

    override fun onBind(intent: Intent?): IBinder? = null

    override fun onSensorChanged(event: SensorEvent) {
        when (event.sensor.type) {
            Sensor.TYPE_ACCELEROMETER -> {
                accelBuffer[0] = event.values[0]
                accelBuffer[1] = event.values[1]
                accelBuffer[2] = event.values[2]
                
                // Check for impact
                val accelMag = sqrt(
                    accelBuffer[0] * accelBuffer[0] +
                    accelBuffer[1] * accelBuffer[1] +
                    accelBuffer[2] * accelBuffer[2]
                )

                val now = System.currentTimeMillis()
                if (accelMag > impactThreshold) {
                    lastImpactTime = now
                }

                // Check for fall pattern: impact + inactivity
                if (lastImpactTime != 0L && 
                    (now - lastImpactTime) in 600..inactivityWindowMs &&
                    (now - lastFallTime) > fallCooldownMs) {
                    
                    // Additional validation: check if combined with other sensors
                    if (shouldTriggerFall()) {
                        lastImpactTime = 0L
                        lastFallTime = now
                        notifyFall()
                        FallDetectionPlugin.notifyFallToJs()
                    }
                }
            }
            
            Sensor.TYPE_GYROSCOPE -> {
                gyroBuffer[0] = event.values[0]
                gyroBuffer[1] = event.values[1]
                gyroBuffer[2] = event.values[2]
                
                // Detect abnormal rotation (spinning fall)
                val rotationMag = sqrt(
                    gyroBuffer[0] * gyroBuffer[0] +
                    gyroBuffer[1] * gyroBuffer[1] +
                    gyroBuffer[2] * gyroBuffer[2]
                )
                
                if (rotationMag > rotationThreshold) {
                    lastImpactTime = System.currentTimeMillis()
                }
            }
            
            Sensor.TYPE_PRESSURE -> {
                // Detect rapid altitude change (falling down)
                if (lastPressure > 0f) {
                    val pressureChange = abs(event.values[0] - lastPressure)
                    if (pressureChange > 5f) { // ~50m altitude change
                        pressureDropped = true
                    }
                }
                lastPressure = event.values[0]
            }
        }
    }

    override fun onAccuracyChanged(sensor: Sensor?, accuracy: Int) {
        // No-op
    }
    
    private fun shouldTriggerFall(): Boolean {
        // Multi-sensor validation
        val hasAccelImpact = lastImpactTime != 0L
        val hasRotation = gyroBuffer[0] > 100 || gyroBuffer[1] > 100 || gyroBuffer[2] > 100
        val hasPressureDrop = pressureDropped
        
        pressureDropped = false // Reset after check
        
        return when (sensitivityLevel) {
            "HIGH" -> hasAccelImpact // Very sensitive, any impact + inactivity
            "MEDIUM" -> hasAccelImpact && (hasRotation || hasPressureDrop) // Impact + additional sensor
            "LOW" -> hasAccelImpact && (hasRotation && hasPressureDrop) // All sensors must confirm
            else -> hasAccelImpact
        }
    }
    
    private fun loadSensitivityLevel() {
        val prefs = getSharedPreferences("safenest_settings", Context.MODE_PRIVATE)
        sensitivityLevel = prefs.getString("fall_detection_sensitivity", "MEDIUM") ?: "MEDIUM"
        
        // Update thresholds based on sensitivity
        impactThreshold = when (sensitivityLevel) {
            "HIGH" -> 15.0f // Very sensitive
            "MEDIUM" -> 22.0f // Standard
            "LOW" -> 35.0f // Less sensitive
            else -> 22.0f
        }
    }

    private fun startForegroundWithNotification() {
        val channelId = "fall_detection_service"
        val nm = getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
        nm.createNotificationChannel(
            NotificationChannel(
                channelId,
                "Fall Detection Service",
                NotificationManager.IMPORTANCE_LOW
            ).apply { setSound(null, null) }
        )

        val notification = NotificationCompat.Builder(this, channelId)
            .setContentTitle("Safenest fall detection")
            .setContentText("Monitoring for falls")
            .setSmallIcon(android.R.drawable.stat_notify_more)
            .setOngoing(true)
            .build()

        startForeground(42, notification)
    }

    private fun notifyFall() {
        val channelId = "emergency_alerts_v2"
        val nm = getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
        nm.createNotificationChannel(
            NotificationChannel(
                channelId,
                "Emergency Alerts",
                NotificationManager.IMPORTANCE_HIGH
            ).apply {
                enableVibration(true)
                vibrationPattern = longArrayOf(500, 200, 500, 200, 500)
            }
        )
        val notification = NotificationCompat.Builder(this, channelId)
            .setContentTitle("Possible fall detected")
            .setContentText("Tap to open Safenest")
            .setPriority(NotificationCompat.PRIORITY_HIGH)
            .setSmallIcon(android.R.drawable.stat_sys_warning)
            .setAutoCancel(true)
            .build()
        nm.notify(1337, notification)
    }
}