import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = "https://auadfaboxudeeklegaie.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImF1YWRmYWJveHVkZWVrbGVnYWllIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MzcwNTIzNSwiZXhwIjoyMDg5MjgxMjM1fQ.-lW7bu6yjfmu2oKNVrGwZjEk5F-03jklnfrOhUDr5_8";

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const contacts = [
  {
    full_name: "Adam Martuccio",
    current_title: "Co-Founder",
    current_company: "Holberton School Australia",
    career_history: [
      { title: "Co-Founder", company: "Holberton School Australia", start_date: "Feb 2022", end_date: null, is_current: true },
      { title: "Podcast Host", company: "What the Heck is Tech", start_date: "Dec 2023", end_date: null, is_current: true },
      { title: "Customer Engagement Lead", company: "Onepoint", start_date: "Jan 2024", end_date: null, is_current: true },
      { title: "Growth", company: "Clarice Care", start_date: "Jan 2025", end_date: null, is_current: true },
      { title: "Business Manager", company: "Galaxy Music", start_date: "Oct 2025", end_date: null, is_current: true }
    ]
  },
  {
    full_name: "Emmanuel Goutallier",
    current_title: "Partner Executive APAC",
    current_company: "Onepoint",
    career_history: [
      { title: "Partner Executive APAC", company: "Onepoint", start_date: "Jul 2018", end_date: null, is_current: true },
      { title: "Founder", company: "Holberton School Australia", start_date: "Oct 2021", end_date: null, is_current: true },
      { title: "Builder", company: "Clarice", start_date: "Jan 2025", end_date: null, is_current: true },
      { title: "Co-Founder", company: "AgriBuy", start_date: "Jan 2024", end_date: null, is_current: true },
      { title: "Senior Advisor Strategic Deals", company: "OVH", start_date: "Nov 2015", end_date: "Jul 2018", is_current: false }
    ]
  },
  {
    full_name: "Heidi Leeman",
    current_title: "Communications",
    current_company: "Clarice Care",
    career_history: [
      { title: "Communications", company: "Clarice Care", start_date: "Aug 2025", end_date: null, is_current: true },
      { title: "Program Operations and Engagement Lead", company: "Holberton School Australia", start_date: "Apr 2025", end_date: null, is_current: true },
      { title: "Volunteer Paralegal", company: "Youth Law Australia", start_date: "May 2024", end_date: "Jun 2025", is_current: false },
      { title: "Senior Bartender", company: "Arts Centre Melbourne", start_date: "Feb 2023", end_date: "Apr 2025", is_current: false },
      { title: "Legal Intern", company: "University of Indonesia", start_date: "Jan 2024", end_date: "Feb 2024", is_current: false }
    ]
  }
];

const MONTHS = { Jan:'01',Feb:'02',Mar:'03',Apr:'04',May:'05',Jun:'06',Jul:'07',Aug:'08',Sep:'09',Oct:'10',Nov:'11',Dec:'12' };
function parseDate(str) {
  if (!str) return null;
  const [mon, year] = str.split(' ');
  return `${year}-${MONTHS[mon]}-01`;
}

for (const contact of contacts) {
  const [first_name, ...rest] = contact.full_name.split(' ');
  const last_name = rest.join(' ');

  console.log(`\n--- [${contact.full_name}] ---`);
  console.log(`  Searching with first_name="${first_name}", last_name="${last_name}"`);

  // Try exact match first
  const eqResult = await supabase
    .from('contacts')
    .select('id, first_name, last_name')
    .eq('first_name', first_name)
    .eq('last_name', last_name);
  console.log('  eq result:', JSON.stringify(eqResult));

  // Try ilike match
  const ilikeResult = await supabase
    .from('contacts')
    .select('id, first_name, last_name')
    .ilike('first_name', `%${first_name}%`)
    .ilike('last_name', `%${last_name}%`);
  console.log('  ilike result:', JSON.stringify(ilikeResult));

  const found = (ilikeResult.data ?? []).length > 0
    ? ilikeResult.data[0]
    : (eqResult.data ?? [])[0] ?? null;

  const findError = eqResult.error ?? ilikeResult.error;

  if (findError) {
    console.error(`[${contact.full_name}] Find error:`, findError.message);
    continue;
  }

  if (!found) {
    console.warn(`[${contact.full_name}] Not found in database — skipping`);
    continue;
  }

  const contactId = found.id;

  // Update job_title and company_name
  const { error: updateError } = await supabase
    .from('contacts')
    .update({ job_title: contact.current_title, company_name: contact.current_company })
    .eq('id', contactId);

  if (updateError) {
    console.error(`[${contact.full_name}] Update error:`, updateError.message);
    continue;
  }

  // Delete existing contact_roles
  const { error: deleteError } = await supabase
    .from('contact_roles')
    .delete()
    .eq('contact_id', contactId);

  if (deleteError) {
    console.error(`[${contact.full_name}] Delete roles error:`, deleteError.message);
    continue;
  }

  // Insert career history
  const roles = contact.career_history.map(role => ({
    contact_id: contactId,
    title: role.title,
    company_name: role.company,
    start_date: parseDate(role.start_date),
    end_date: parseDate(role.end_date),
    is_current: role.is_current,
  }));

  const { error: insertError } = await supabase
    .from('contact_roles')
    .insert(roles);

  if (insertError) {
    console.error(`[${contact.full_name}] Insert roles error:`, insertError.message);
    continue;
  }

  console.log(`[${contact.full_name}] Success — updated profile + inserted ${roles.length} roles`);
}
