package com.safenest.app.fit

import android.app.Activity
import android.content.Context
import androidx.activity.result.ActivityResultLauncher
import androidx.activity.result.contract.ActivityResultContracts
import com.google.android.gms.auth.api.signin.GoogleSignIn
import com.google.android.gms.auth.api.signin.GoogleSignInClient
import com.google.android.gms.auth.api.signin.GoogleSignInOptions
import com.google.android.gms.auth.api.signin.GoogleSignInOptionsBuilder
import com.google.android.gms.fitness.Fitness
import com.google.android.gms.fitness.FitnessOptions

/**
 * FitSignInHandler
 * Helper to check & request Google Fit permissions and trigger sign-in flows.
 * - Uses FitnessOptions defined in FitRepository (keep them consistent)
 * - Use ActivityResultLauncher or GoogleSignIn.requestPermissions for granular control
 */
class FitSignInHandler(private val context: Context) {

    private val fitnessOptions: FitnessOptions = FitRepository(context).fitnessOptions

    fun hasPermissions(): Boolean {
        val acct = GoogleSignIn.getAccountForExtension(context, fitnessOptions)
        return GoogleSignIn.hasPermissions(acct, fitnessOptions)
    }

    /**
     * Request permissions using the ActivityResult API.
     * Example usage in an Activity or Fragment:
     *   val launcher = registerForActivityResult(StartActivityForResult()) { result -> ... }
     *   FitSignInHandler(this).requestPermissions(launcher)
     */
    fun requestPermissions(activity: Activity, requestCode: Int) {
        val acct = GoogleSignIn.getAccountForExtension(context, fitnessOptions)
        if (!GoogleSignIn.hasPermissions(acct, fitnessOptions)) {
            GoogleSignIn.requestPermissions(
                activity,
                requestCode,
                acct,
                fitnessOptions
            )
        }
    }

    /**
     * Optionally return the sign-in intent for a full Google sign-in (not always necessary)
     */
    fun getSignInClient(): GoogleSignInClient {
        val gso = GoogleSignInOptions.Builder(GoogleSignInOptions.DEFAULT_SIGN_IN).requestEmail().build()
        return GoogleSignIn.getClient(context, gso)
    }
}
