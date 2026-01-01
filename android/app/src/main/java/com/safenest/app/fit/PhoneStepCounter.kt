package com.safenest.app.fit

import android.content.Context
import android.hardware.Sensor
import android.hardware.SensorEvent
import android.hardware.SensorEventListener
import android.hardware.SensorManager
import android.util.Log
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale
import java.util.concurrent.CountDownLatch
import java.util.concurrent.TimeUnit

/**
 * Lightweight phone step counter helper using TYPE_STEP_COUNTER.
 * - Captures cumulative steps since boot and normalizes to today's total using an offset.
 * - Returns null if sensor unavailable or no reading received within timeout.
 */
object PhoneStepCounter {

    private const val TAG = "PhoneStepCounter"
    private const val PREFS_NAME = "phone_steps"
    private const val KEY_BASE_DATE = "base_date"
    private const val KEY_BASE_OFFSET = "base_offset"

    private val dateFormat = SimpleDateFormat("yyyyMMdd", Locale.US)

    fun getTodaySteps(context: Context): Int? {
        val sensorManager = context.getSystemService(Context.SENSOR_SERVICE) as? SensorManager
            ?: return null
        val stepCounter = sensorManager.getDefaultSensor(Sensor.TYPE_STEP_COUNTER) ?: return null

        val prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
        val todayKey = dateFormat.format(Date())
        val savedDate = prefs.getString(KEY_BASE_DATE, null)
        var baseOffset = prefs.getFloat(KEY_BASE_OFFSET, 0f)

        // Reset offset at day change
        if (savedDate == null || savedDate != todayKey) {
            baseOffset = 0f
            prefs.edit()
                .putString(KEY_BASE_DATE, todayKey)
                .putFloat(KEY_BASE_OFFSET, baseOffset)
                .apply()
        }

        val latch = CountDownLatch(1)
        var cumulative: Float? = null

        val listener = object : SensorEventListener {
            override fun onSensorChanged(event: SensorEvent) {
                if (event.values.isNotEmpty()) {
                    cumulative = event.values[0]
                    latch.countDown()
                }
            }

            override fun onAccuracyChanged(sensor: Sensor?, accuracy: Int) {}
        }

        try {
            sensorManager.registerListener(listener, stepCounter, SensorManager.SENSOR_DELAY_NORMAL)
            // Wait up to 1 second for a reading
            latch.await(1, TimeUnit.SECONDS)
        } catch (e: Exception) {
            Log.w(TAG, "Step sensor read failed: ${e.message}")
        } finally {
            sensorManager.unregisterListener(listener)
        }

        val cumulativeSteps = cumulative ?: return null

        // Initialize base offset on first reading
        if (baseOffset == 0f) {
            baseOffset = cumulativeSteps
            prefs.edit()
                .putString(KEY_BASE_DATE, todayKey)
                .putFloat(KEY_BASE_OFFSET, baseOffset)
                .apply()
        }

        val todaySteps = (cumulativeSteps - baseOffset).toInt().coerceAtLeast(0)
        return todaySteps
    }
}