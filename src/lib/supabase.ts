import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || 'https://atxoupjkwoltgwlbhkih.supabase.co';
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImF0eG91cGprd29sdGd3bGJoa2loIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzc5MjYwOTMsImV4cCI6MjA5MzUwMjA5M30.fqBN917DUlIZT405gBcRCh28r4WHuv9ELv4mHZwYycY';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
