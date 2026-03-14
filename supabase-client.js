(function() {
    'use strict';

    const SUPABASE_URL = 'https://hojebvsmethilstyiaqe.supabase.co';
    const SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_SwAXg5HcEWwQRHRAyUECxA_1oWX7J5P';

    if (!window.supabase || typeof window.supabase.createClient !== 'function') {
        console.error('Supabase SDK not loaded. Include @supabase/supabase-js before supabase-client.js');
        return;
    }

    window.supabaseLabClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
        auth: {
            persistSession: true,
            autoRefreshToken: true,
            detectSessionInUrl: true
        }
    });

    console.log('Supabase client initialized:', SUPABASE_URL);
})();
