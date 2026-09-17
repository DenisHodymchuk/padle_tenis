const { createClient } = require('@supabase/supabase-js');

const url = 'https://rhtyiorgigijurfgysux.supabase.co';
const key = 'sb_publishable_fou4ccXSGTaBwJ70tn2WaQ_BzokRLUP';

const supabase = createClient(url, key);

async function testAll() {
  console.log('Testing users select...');
  const res1 = await supabase.from('users').select('*');
  console.log('users select:', res1);

  console.log('Testing matches select...');
  const res2 = await supabase.from('matches').select('*');
  console.log('matches select:', res2);

  console.log('Testing matches insert...');
  const res3 = await supabase.from('matches').insert({
    title: 'Test',
    status: 'lobby',
    points_per_round: 32
  }).select();
  console.log('matches insert:', res3);
}

testAll();
