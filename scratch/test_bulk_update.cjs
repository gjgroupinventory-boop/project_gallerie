const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_ANON_KEY
);

async function run() {
  // Let's find some active Sales Agents
  const { data: profiles, error: selectError } = await supabase
    .from('profiles')
    .select('id, name, role, permissions')
    .eq('role', 'Sales Agent')
    .limit(3);
  
  if (selectError) {
    console.error('Select error:', selectError);
    return;
  }
  
  console.log('Before update:');
  console.log(JSON.stringify(profiles, null, 2));
  
  const ids = profiles.map(p => p.id);
  const currentPermissions = profiles[0].permissions || {};
  
  // Let's toggle a permission key (e.g. can_add_artwork)
  const nextPermissions = {
    ...currentPermissions,
    can_add_artwork: !currentPermissions.can_add_artwork
  };
  
  console.log('Updating to nextPermissions:', nextPermissions);
  
  const { data: updateData, error: updateError } = await supabase
    .from('profiles')
    .update({ permissions: nextPermissions })
    .in('id', ids)
    .select();
    
  if (updateError) {
    console.error('Update error:', updateError);
  } else {
    console.log('Update success, returned data:');
    console.log(JSON.stringify(updateData, null, 2));
  }
}
run();
