const { createClient } = require('@supabase/supabase-js');
const crypto = require('crypto');

const url = 'https://rhtyiorgigijurfgysux.supabase.co';
const key = 'sb_publishable_fou4ccXSGTaBwJ70tn2WaQ_BzokRLUP';
const supabase = createClient(url, key);

function formatUuid(prefix, raw) {
  const str = String(raw).replace(/[^0-9]/g, '');
  const pad = (str || '1').padStart(12, '0').slice(-12);
  const typeByte = prefix === 'user' ? '8000' : prefix === 'match' ? '9000' : 'a000';
  return `00000000-0000-4000-${typeByte}-${pad}`;
}

async function simulateHostAndFriend() {
  console.log('=== SIMULATING HOST CREATING LOBBY ===');
  const hostTgId = 11111;
  const hostDbUserId = formatUuid('user', hostTgId);

  // 1. Host syncs user
  const { data: hostUser, error: huErr } = await supabase.from('users').upsert({
    id: hostDbUserId,
    telegram_id: hostTgId,
    first_name: 'Організатор',
    last_name: 'Падел',
    username: 'organizer'
  }).select().single();

  console.log('Host user:', hostUser, huErr);

  // 2. Host creates match
  const rawTs = Date.now();
  const dbMatchId = formatUuid('match', rawTs);
  const dbPartId = formatUuid('part', rawTs);

  const { data: match, error: mErr } = await supabase.from('matches').insert({
    id: dbMatchId,
    creator_id: hostDbUserId,
    title: 'Падел Американка (5 гравців)',
    status: 'lobby',
    points_per_round: 32
  }).select().single();

  console.log('Host created match:', match, mErr);

  const { data: hostPart, error: hpErr } = await supabase.from('match_participants').insert({
    id: dbPartId,
    match_id: dbMatchId,
    user_id: hostDbUserId
  }).select();

  console.log('Host participant:', hostPart, hpErr);

  console.log('\n=== SIMULATING FRIEND JOINING VIA DEEP LINK ===');
  const friendTgId = 22222;
  const friendDbUserId = formatUuid('user', friendTgId);

  // 1. Friend syncs user
  const { data: friendUser, error: fuErr } = await supabase.from('users').upsert({
    id: friendDbUserId,
    telegram_id: friendTgId,
    first_name: 'Друг',
    last_name: 'Падел',
    username: 'friend'
  }).select().single();

  console.log('Friend user:', friendUser, fuErr);

  // 2. Friend fetches match by startParam rawTs
  const searchMatchId = formatUuid('match', rawTs);
  const { data: foundMatch, error: fmErr } = await supabase
    .from('matches')
    .select('*')
    .eq('id', searchMatchId)
    .maybeSingle();

  console.log('Friend found match in DB:', foundMatch, fmErr);

  if (foundMatch) {
    // 3. Friend inserts themselves into match_participants
    const friendPartId = formatUuid('part', Date.now());
    const { data: friendPart, error: fpErr } = await supabase.from('match_participants').insert({
      id: friendPartId,
      match_id: foundMatch.id,
      user_id: friendDbUserId
    }).select();

    console.log('Friend inserted participant:', friendPart, fpErr);

    // 4. Friend fetches all participants
    const { data: allParts, error: apErr } = await supabase
      .from('match_participants')
      .select('*, users(*)')
      .eq('match_id', foundMatch.id);

    console.log('All participants in match now:', allParts, apErr);
  }
}

simulateHostAndFriend();
