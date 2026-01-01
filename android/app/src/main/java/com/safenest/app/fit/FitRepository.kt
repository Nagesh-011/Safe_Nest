package com.safenest.app.fit

import android.content.Context
import android.util.Log
import com.google.android.gms.auth.api.signin.GoogleSignIn
import com.google.android.gms.fitness.Fitness
import com.google.android.gms.fitness.data.DataPoint
import com.google.android.gms.fitness.data.DataSet
import com.google.android.gms.fitness.data.DataSource
import com.google.android.gms.fitness.data.DataType
import com.google.android.gms.fitness.data.Field
import com.google.android.gms.fitness.request.DataReadRequest
import com.google.android.gms.fitness.request.DataUpdateRequest
import com.google.android.gms.fitness.request.OnDataPointListener
import com.google.android.gms.fitness.request.SessionInsertRequest
import com.google.android.gms.tasks.Tasks
import com.safenest.app.fit.PhoneStepCounter
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.tasks.await
import kotlinx.coroutines.withContext
import java.util.Calendar
import java.util.concurrent.TimeUnit
import java.util.*

/**
 * FitRepository
 * Phone-side repository that reads (and can insert) data to Google Fit on behalf of the app.
 * - Uses coroutines + tasks.await()
 * - All methods are suspend and fail gracefully with logged errors
 * - Replace package name placeholders above if needed
 */
class FitRepository(private val context: Context) {

    companion object {
        private const val TAG = "FitRepository"
    }

    // Declare the FitnessOptions expected by your app (match your Sign-In flow)
    val fitnessOptions = com.google.android.gms.fitness.FitnessOptions.builder()
        .addDataType(DataType.TYPE_STEP_COUNT_DELTA, com.google.android.gms.fitness.FitnessOptions.ACCESS_READ)
        .addDataType(DataType.TYPE_HEART_RATE_BPM, com.google.android.gms.fitness.FitnessOptions.ACCESS_READ)
        .addDataType(DataType.TYPE_CALORIES_EXPENDED, com.google.android.gms.fitness.FitnessOptions.ACCESS_READ)
        .addDataType(DataType.TYPE_DISTANCE_DELTA, com.google.android.gms.fitness.FitnessOptions.ACCESS_READ)
        .build()

    private fun getAccount() = GoogleSignIn.getAccountForExtension(context, fitnessOptions)

    /** Request subscriptions so Fit keeps collecting server-side when available. Non-blocking. */
    suspend fun ensureSubscriptions() = withContext(Dispatchers.IO) {
        try {
            val acct = getAccount()
            if (!GoogleSignIn.hasPermissions(acct, fitnessOptions)) {
                Log.w(TAG, "ensureSubscriptions: missing permissions")
                return@withContext
            }

            val recordingClient = Fitness.getRecordingClient(context, acct)
            // Subscribe to types we want to observe
            runCatching { recordingClient.subscribe(DataType.TYPE_STEP_COUNT_DELTA).await() }
                .onFailure { Log.w(TAG, "Subscribe steps failed: ${it.message}") }
            runCatching { recordingClient.subscribe(DataType.TYPE_HEART_RATE_BPM).await() }
                .onFailure { Log.w(TAG, "Subscribe hr failed: ${it.message}") }
            runCatching { recordingClient.subscribe(DataType.TYPE_CALORIES_EXPENDED).await() }
                .onFailure { Log.w(TAG, "Subscribe calories failed: ${it.message}") }
            runCatching { recordingClient.subscribe(DataType.TYPE_DISTANCE_DELTA).await() }
                .onFailure { Log.w(TAG, "Subscribe distance failed: ${it.message}") }

            Log.d(TAG, "ensureSubscriptions: completed")
        } catch (e: Exception) {
            Log.e(TAG, "ensureSubscriptions error", e)
        }
    }

    /** Reads today's total steps.
     * Priority: phone sensor (TYPE_STEP_COUNTER) -> Google Fit daily total (fallback)
     */
    suspend fun getTodaySteps(): Int = withContext(Dispatchers.IO) {
        // Try phone hardware step counter first (no Fit required)
        try {
            PhoneStepCounter.getTodaySteps(context)?.let { return@withContext it }
        } catch (e: Exception) {
            Log.w(TAG, "Phone step counter failed: ${e.message}")
        }

        // Fallback to Google Fit steps
        try {
            val acct = getAccount()
            if (!GoogleSignIn.hasPermissions(acct, fitnessOptions)) throw NotSignedInException()
            val ds = Fitness.getHistoryClient(context, acct)
                .readDailyTotal(DataType.TYPE_STEP_COUNT_DELTA).await()
            val steps = ds?.dataPoints?.firstOrNull()?.getValue(Field.FIELD_STEPS)?.asInt() ?: 0
            return@withContext steps
        } catch (e: NotSignedInException) {
            Log.w(TAG, "getTodaySteps: not signed in")
            throw e
        } catch (e: Exception) {
            Log.e(TAG, "getTodaySteps error", e)
            return@withContext 0
        }
    }

    /** Reads latest heart rate value in the last N minutes (returns null if none) */
    suspend fun getLatestHeartRate(windowMinutes: Long = 30): Float? = withContext(Dispatchers.IO) {
        try {
            val acct = getAccount()
            if (!GoogleSignIn.hasPermissions(acct, fitnessOptions)) throw NotSignedInException()

            val end = System.currentTimeMillis()
            val start = end - TimeUnit.MINUTES.toMillis(windowMinutes)

            val readRequest = DataReadRequest.Builder()
                .read(DataType.TYPE_HEART_RATE_BPM)
                .setTimeRange(start, end, TimeUnit.MILLISECONDS)
                .setLimit(50)
                .build()

            val result = Fitness.getHistoryClient(context, acct).readData(readRequest).await()
            val points = result.dataSets.flatMap { it.dataPoints }
            val latest = points.maxByOrNull { it.getEndTime(TimeUnit.MILLISECONDS) }
            return@withContext latest?.getValue(Field.FIELD_BPM)?.asFloat()
        } catch (e: NotSignedInException) {
            Log.w(TAG, "getLatestHeartRate: not signed in")
            throw e
        } catch (e: Exception) {
            Log.e(TAG, "getLatestHeartRate error", e)
            return@withContext null
        }
    }

    /** Reads calories burned today */
    suspend fun getCaloriesToday(): Float = withContext(Dispatchers.IO) {
        try {
            val acct = getAccount()
            if (!GoogleSignIn.hasPermissions(acct, fitnessOptions)) throw NotSignedInException()
            val ds = Fitness.getHistoryClient(context, acct)
                .readDailyTotal(DataType.TYPE_CALORIES_EXPENDED).await()
            val calories = ds?.dataPoints?.firstOrNull()?.getValue(Field.FIELD_CALORIES)?.asFloat() ?: 0f
            return@withContext calories
        } catch (e: NotSignedInException) {
            Log.w(TAG, "getCaloriesToday: not signed in")
            throw e
        } catch (e: Exception) {
            Log.e(TAG, "getCaloriesToday error", e)
            return@withContext 0f
        }
    }

    /** Reads distance today in meters */
    suspend fun getDistanceToday(): Float = withContext(Dispatchers.IO) {
        try {
            val acct = getAccount()
            if (!GoogleSignIn.hasPermissions(acct, fitnessOptions)) throw NotSignedInException()
            val ds = Fitness.getHistoryClient(context, acct)
                .readDailyTotal(DataType.TYPE_DISTANCE_DELTA).await()
            val dist = ds?.dataPoints?.firstOrNull()?.getValue(Field.FIELD_DISTANCE)?.asFloat() ?: 0f
            return@withContext dist
        } catch (e: NotSignedInException) {
            Log.w(TAG, "getDistanceToday: not signed in")
            throw e
        } catch (e: Exception) {
            Log.e(TAG, "getDistanceToday error", e)
            return@withContext 0f
        }
    }

    /** Helper to insert steps received from a companion (watch) into Google Fit history */
    suspend fun insertStepsFromWatch(steps: Int, startTimeMs: Long, endTimeMs: Long) = withContext(Dispatchers.IO) {
        try {
            val acct = getAccount()
            if (!GoogleSignIn.hasPermissions(acct, fitnessOptions)) throw NotSignedInException()

            val dataSource = DataSource.Builder()
                .setAppPackageName(context)
                .setDataType(DataType.TYPE_STEP_COUNT_DELTA)
                .setType(DataSource.TYPE_RAW)
                .setStreamName("safenest_steps_from_watch")
                .build()

            val dp = DataPoint.builder(dataSource)
                .setTimeInterval(startTimeMs, endTimeMs, TimeUnit.MILLISECONDS)
                .setField(Field.FIELD_STEPS, steps)
                .build()

            val dataSet = DataSet.builder(dataSource).add(dp).build()

            Fitness.getHistoryClient(context, acct).insertData(dataSet).await()
            Log.d(TAG, "insertStepsFromWatch: inserted $steps steps")
        } catch (e: NotSignedInException) {
            Log.w(TAG, "insertStepsFromWatch: not signed in")
            throw e
        } catch (e: Exception) {
            Log.e(TAG, "insertStepsFromWatch error", e)
        }
    }

    private fun startOfDayMillis(): Long {
        val cal = Calendar.getInstance().apply {
            set(Calendar.HOUR_OF_DAY, 0); set(Calendar.MINUTE, 0); set(Calendar.SECOND, 0); set(Calendar.MILLISECOND, 0)
        }
        return cal.timeInMillis
    }

    // Blocking wrapper for callers from Java (plugins) to request subscriptions synchronously
    fun ensureSubscriptionsBlocking() {
        kotlinx.coroutines.runBlocking {
            ensureSubscriptions()
        }
    }

    // Blocking wrappers for simple reads to be used by Java plugins
    fun getTodayStepsBlocking(): Int = kotlinx.coroutines.runBlocking { getTodaySteps() }
    fun getLatestHeartRateBlocking(windowMinutes: Long = 30): Float? = kotlinx.coroutines.runBlocking { getLatestHeartRate(windowMinutes) }
    fun getCaloriesTodayBlocking(): Float = kotlinx.coroutines.runBlocking { getCaloriesToday() }
    fun getDistanceTodayBlocking(): Float = kotlinx.coroutines.runBlocking { getDistanceToday() }

    class NotSignedInException : Exception("Google account not signed in or permissions missing")
}
