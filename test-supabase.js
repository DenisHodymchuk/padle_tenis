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

console.log('formatUuid user 1001:', formatUuid('user', 1001));
console.log('formatUuid match 1789640888058:', formatUuid('match', '1789640888058'));
