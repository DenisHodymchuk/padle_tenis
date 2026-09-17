const { createClient } = require('@supabase/supabase-js');

const url = 'https://rhtyiorgigijurfgysux.supabase.co';
const key = 'sb_publishable_fou4ccXSGTaBwJ70tn2WaQ_BzokRLUP';
const supabase = createClient(url, key);

function formatUuid(prefix, raw) {
  const str = String(raw).replace(/[^0-9]/g, '');
  const pad = (str || '1').padStart(12, '0').slice(-12);
  const typeByte = prefix === 'user' ? '8000' : prefix === 'match' ? '9000' : 'a000';
  return `00000000-0000-4000-${typeByte}-${pad}`;
}

async function testSmartJoin() {
  console.log('--- TESTING SMART JOIN LOGIC ---');
  const friendTgId = 55554444;
  const friendDbUserId = formatUuid('user', friendTgId);

  // 1. Sync user
  await supabase.from('users').upsert({
    id: friendDbUserId,
    telegram_id: friendTgId,
    first_name: 'Петро',
    last_name: 'Паделіст',
    username: 'petro_padel'
  });

  // 2. Query matches with fallback to any active lobby
  const { data: activeLobbies } = await supabase
    .from('matches')
    .select('*')
    .eq('status', 'lobby')
    .order('created_at', { ascending: false })
    .limit(1);

  console.log('Found active lobby in Supabase:', activeLobbies);

  if (activeLobbies && activeLobbies.length > 0) {
    const match = activeLobbies[0];
    const dbPartId = formatUuid('part', Date.now());

    await supabase.from('match_participants').upsert({
      id: dbPartId,
      match_id: match.id,
      user_id: friendDbUserId
    }, { onConflict: 'match_id,user_id' });

    const { data: allParts } = await supabase
      .from('match_participants')
      .select('*, users(*)')
      .eq('match_id', match.id);

    console.log('\n=== ALL PLAYERS IN LOBBY NOW ===');
    allParts.forEach((p, i) => {
      console.log(`#${i + 1}: ${p.users.first_name} ${p.users.last_name} (@${p.users.username})`);
    });
  }
}

testSmartJoin();
