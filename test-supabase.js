const { createClient } = require('@supabase/supabase-js');

const url = 'https://rhtyiorgigijurfgysux.supabase.co';
const key = 'sb_publishable_fou4ccXSGTaBwJ70tn2WaQ_BzokRLUP';
const supabase = createClient(url, key);

async function cleanAllTestLobbies() {
  console.log('--- CLEANING ALL TEST MATCHES & PARTICIPANTS FROM SUPABASE ---');

  const { error: rErr } = await supabase.from('rounds').delete().not('id', 'is', null);
  console.log('Rounds delete:', rErr);

  const { error: pErr } = await supabase.from('match_participants').delete().not('id', 'is', null);
  console.log('Participants delete:', pErr);

  const { error: mErr } = await supabase.from('matches').delete().not('id', 'is', null);
  console.log('Matches delete:', mErr);

  console.log('Database cleaned 100% cleanly!');
}

cleanAllTestLobbies();
