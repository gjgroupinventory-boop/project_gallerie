const { createClient } = require('@supabase/supabase-client');

const supabaseUrl = 'https://rykngmvpzzbubcjtdhtt.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJ5a25nbXZwenpidWJjanRkaHR0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzc2NDk5MjIsImV4cCI6MjA5MzIyNTkyMn0.tL2L2sA7MZynfnTAJWSL8ocINBeErrVscTVTwj5_wSY';
const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
  const { data: transfers } = await supabase.from('transfer_requests').select('id, artwork_title, status');
  console.log('--- TRANSFER REQUESTS ---');
  console.log(transfers);

  const { data: returns } = await supabase.from('return_records').select('id, artwork_code, status');
  console.log('--- RETURN RECORDS ---');
  console.log(returns);
}

check();
