const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  'https://rykngmvpzzbubcjtdhtt.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJ5a25nbXZwenpidWJjanRkaHR0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzc2NDk5MjIsImV4cCI6MjA5MzIyNTkyMn0.tL2L2sA7MZynfnTAJWSL8ocINBeErrVscTVTwj5_wSY'
);

async function run() {
  const { data: profiles, error } = await supabase
    .from('profiles')
    .select('id, name, email, role, permissions')
    .limit(100);

  if (error) {
    console.error('Error fetching profiles:', error);
    return;
  }

  console.log('Profiles:');
  profiles.forEach(p => {
    console.log(`- Name: ${p.name} (${p.email}) - Role: ${p.role}`);
    console.log(`  Permissions: ${JSON.stringify(p.permissions)}`);
  });
}
run();
