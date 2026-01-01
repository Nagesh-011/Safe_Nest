package com.safenest.app.fit

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import kotlinx.coroutines.CoroutineExceptionHandler
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.delay
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext

/**
 * Vitals data model
 */
data class Vitals(
    val steps: Int = 0,
    val heartRate: Float? = null,
    val calories: Float = 0f,
    val distanceMeters: Float = 0f
)

/**
 * VitalsViewModel
 * - Periodically refreshes data from FitRepository
 * - Exposes StateFlow for UI binding
 */
class VitalsViewModel(private val repo: FitRepository) : ViewModel() {

    private val _vitals = MutableStateFlow(Vitals())
    val vitals: StateFlow<Vitals> = _vitals

    private val _error = MutableStateFlow<String?>(null)
    val error: StateFlow<String?> = _error

    private val refreshHandler = CoroutineExceptionHandler { _, ex ->
        _error.value = ex.message
    }

    init {
        viewModelScope.launch(refreshHandler + Dispatchers.IO) {
            // Ensure Fit subscriptions so data arrives from Wear and device sensors
            repo.ensureSubscriptions()
            refresh() // initial

            // Periodic refresh; tweak interval as needed
            while (true) {
                delay(30_000)
                refresh()
            }
        }
    }

    suspend fun refresh() = withContext(Dispatchers.IO) {
        try {
            val steps = repo.getTodaySteps()
            val hr = repo.getLatestHeartRate()
            val calories = repo.getCaloriesToday()
            val dist = repo.getDistanceToday()
            _vitals.value = Vitals(steps, hr, calories, dist)
            _error.value = null
        } catch (e: FitRepository.NotSignedInException) {
            _error.value = "Sign-in required"
        } catch (e: Exception) {
            _error.value = "Data unavailable"
        }
    }
}
