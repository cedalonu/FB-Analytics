import * as cheerio from 'cheerio';
import {
  FixtureMatch,
  FinishedMatch,
  TeamStats,
  LeagueOption
} from '../types/football';

const USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

// Cache structure
interface CacheEntry<T> {
  data: T;
  timestamp: number;
}
const cache = new Map<string, CacheEntry<unknown>>();
const CACHE_TTL_MS = 3 * 60 * 1000; // 3 minutes

export async function fetchWithHeaders(url: string): Promise<string> {
  const resp = await fetch(url, {
    headers: {
      'User-Agent': USER_AGENT,
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      'Accept-Language': 'en-US,en;q=0.9,es;q=0.8',
    },
  });
  if (!resp.ok) {
    throw new Error(`Failed to fetch ${url}: ${resp.status} ${resp.statusText}`);
  }
  return await resp.text();
}

/**
 * Parses all available leagues from thefishy
 */
export async function getAvailableLeagues(): Promise<LeagueOption[]> {
  const cacheKey = 'all_leagues';
  const cached = cache.get(cacheKey) as CacheEntry<LeagueOption[]> | undefined;
  if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS * 5) {
    return cached.data;
  }

  const defaultLeagues: LeagueOption[] = [
    { id: '1', name: 'Premier League', group: 'England' },
    { id: '2', name: 'Championship', group: 'England' },
    { id: '3', name: 'League One', group: 'England' },
    { id: '4', name: 'League Two', group: 'England' },
    { id: '31', name: 'La Liga', group: 'Spain' },
    { id: '32', name: 'Bundesliga', group: 'Germany' },
    { id: '33', name: 'Serie A', group: 'Italy' },
    { id: '34', name: 'Ligue 1', group: 'France' },
    { id: '10', name: 'Scottish Premiership', group: 'Scotland' },
    { id: '17', name: 'Champions League', group: 'UEFA' },
    { id: '18', name: 'Europa League', group: 'UEFA' },
    { id: '74', name: 'Australia A-League', group: 'Oceania' },
    { id: '30', name: 'MLS', group: 'America' },
  ];

  try {
    const html = await fetchWithHeaders('https://thefishy.co.uk/football-fixtures.php');
    const $ = cheerio.load(html);
    const parsedLeagues: LeagueOption[] = [];
    const seenIds = new Set<string>();

    $('select#league option').each((_, el) => {
      const val = $(el).attr('value');
      const text = $(el).text().trim();
      const group = $(el).parent('optgroup').attr('label') || 'Otras Ligas';
      if (val && val.includes('table=')) {
        const m = val.match(/table=(\d+)/);
        if (m && !seenIds.has(m[1])) {
          seenIds.add(m[1]);
          parsedLeagues.push({
            id: m[1],
            name: text.replace(/\s+Fixtures$/i, '').replace(/&apos;/g, "'"),
            group,
          });
        }
      }
    });

    if (parsedLeagues.length > 0) {
      cache.set(cacheKey, { data: parsedLeagues, timestamp: Date.now() });
      return parsedLeagues;
    }
  } catch (err) {
    console.warn('Error fetching leagues list from thefishy, using defaults:', err);
  }

  return defaultLeagues;
}

/**
 * Parses date string like "Mon 19-Oct-2026" or "19-Oct-2026" or "Fri 23/10"
 */
function parseDateHeader(dateStr: string, currentYear: number = new Date().getFullYear()): Date {
  const clean = dateStr.trim().toLowerCase();
  const now = new Date();
  const utcNow = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 12, 0, 0));

  if (clean.includes('today') || clean.includes('hoy')) {
    return utcNow;
  }
  if (clean.includes('tomorrow') || clean.includes('mañana')) {
    const d = new Date(utcNow.getTime() + 24 * 60 * 60 * 1000);
    return d;
  }

  const daysOfWeek: Record<string, number> = {
    sun: 0, sunday: 0, domingo: 0,
    mon: 1, monday: 1, lunes: 1,
    tue: 2, tuesday: 2, martes: 2,
    wed: 3, wednesday: 3, miércoles: 3,
    thu: 4, thursday: 4, jueves: 4,
    fri: 5, friday: 5, viernes: 5,
    sat: 6, saturday: 6, sábado: 6
  };

  for (const [dayName, targetDayOfWeek] of Object.entries(daysOfWeek)) {
    if (clean === dayName || clean.startsWith(dayName + ' ') || clean.includes(' ' + dayName)) {
      const currentDayOfWeek = utcNow.getUTCDay();
      let diff = targetDayOfWeek - currentDayOfWeek;
      if (diff < 0) diff += 7;
      const targetTime = utcNow.getTime() + diff * 24 * 60 * 60 * 1000;
      return new Date(targetTime);
    }
  }

  const months: Record<string, number> = {
    jan: 0, feb: 1, mar: 2, apr: 3, may: 4, jun: 5,
    jul: 6, aug: 7, sep: 8, oct: 9, nov: 10, dec: 11
  };

  const matchNamed = clean.match(/(\d{1,2})[-/ ]([a-z]{3,9})(?:[-/ ](\d{2,4}))?/);
  if (matchNamed) {
    const day = parseInt(matchNamed[1], 10);
    const monthStr = matchNamed[2].slice(0, 3);
    const month = months[monthStr] ?? now.getUTCMonth();
    let year = matchNamed[3] ? parseInt(matchNamed[3], 10) : currentYear;
    if (year < 100) year += 2000;
    return new Date(Date.UTC(year, month, day, 12, 0, 0));
  }

  const dmSlash = clean.match(/(\d{1,2})\/(\d{1,2})(?:\/(\d{2,4}))?/);
  if (dmSlash) {
    const day = parseInt(dmSlash[1], 10);
    const month = parseInt(dmSlash[2], 10) - 1;
    let year = dmSlash[3] ? parseInt(dmSlash[3], 10) : currentYear;
    if (year < 100) year += 2000;
    return new Date(Date.UTC(year, month, day, 12, 0, 0));
  }

  return utcNow;
}

/**
 * Fetches and parses League Table and League Table Ext
 */
export async function getLeagueTableAndStats(tableId: string): Promise<Record<string, TeamStats>> {
  const cacheKey = `stats_${tableId}`;
  const cached = cache.get(cacheKey) as CacheEntry<Record<string, TeamStats>> | undefined;
  if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
    return cached.data;
  }

  const teams: Record<string, TeamStats> = {};

  try {
    const [htmlTbl, htmlExt] = await Promise.all([
      fetchWithHeaders(`https://www.thefishy.net/leaguetable.php?table=${tableId}`),
      fetchWithHeaders(`https://www.thefishy.net/leaguetableext.php?table=${tableId}`).catch(() => ''),
    ]);

    // Parse base table
    const $ = cheerio.load(htmlTbl);
    $('table tr').each((_, tr) => {
      const tds = $(tr).find('td');
      if (tds.length >= 20) {
        const pos = parseInt($(tds[0]).text().trim(), 10);
        const teamLink = $(tds[1]).find('a').text().trim();
        const teamName = teamLink || $(tds[1]).text().trim();
        const p = parseInt($(tds[2]).text().trim(), 10);
        const hw = parseInt($(tds[3]).text().trim(), 10);
        const hd = parseInt($(tds[4]).text().trim(), 10);
        const hl = parseInt($(tds[5]).text().trim(), 10);
        const hf = parseInt($(tds[6]).text().trim(), 10);
        const ha = parseInt($(tds[7]).text().trim(), 10);
        const aw = parseInt($(tds[8]).text().trim(), 10);
        const ad = parseInt($(tds[9]).text().trim(), 10);
        const al = parseInt($(tds[10]).text().trim(), 10);
        const af = parseInt($(tds[11]).text().trim(), 10);
        const aa = parseInt($(tds[12]).text().trim(), 10);

        const gdRaw = $(tds[18]).text().trim().replace('+', '');
        const gd = parseInt(gdRaw, 10);
        const pts = parseInt($(tds[19]).text().trim(), 10);
        const ppg = parseFloat($(tds[20]).text().trim());
        const formRaw = $(tds[21]).text().trim();

        // Extract clean form string
        let form = '';
        if (formRaw) {
          form = formRaw.slice(-6); // last 6 matches
        }

        if (teamName && !isNaN(p) && p > 0) {
          teams[teamName] = {
            pos: isNaN(pos) ? 0 : pos,
            team: teamName,
            p,
            hw: isNaN(hw) ? 0 : hw,
            hd: isNaN(hd) ? 0 : hd,
            hl: isNaN(hl) ? 0 : hl,
            hf: isNaN(hf) ? 0 : hf,
            ha: isNaN(ha) ? 0 : ha,
            aw: isNaN(aw) ? 0 : aw,
            ad: isNaN(ad) ? 0 : ad,
            al: isNaN(al) ? 0 : al,
            af: isNaN(af) ? 0 : af,
            aa: isNaN(aa) ? 0 : aa,
            gd: isNaN(gd) ? (hf + af) - (ha + aa) : gd,
            pts: isNaN(pts) ? ((hw + aw) * 3 + (hd + ad)) : pts,
            ppg: isNaN(ppg) ? 0 : ppg,
            form,
          };
        }
      }
    });

    // Parse extended stats if available
    if (htmlExt) {
      const $ext = cheerio.load(htmlExt);
      $ext('table tr').each((_, tr) => {
        const tds = $ext(tr).find('td');
        if (tds.length >= 15) {
          const teamName = $ext(tds[1]).find('a').text().trim() || $ext(tds[1]).text().trim();
          const matchedKey = Object.keys(teams).find(k => k.toLowerCase() === teamName.toLowerCase() || k.includes(teamName) || teamName.includes(k));
          if (matchedKey && teams[matchedKey]) {
            teams[matchedKey].ycF = parseFloat($ext(tds[3]).text().trim()) || 0;
            teams[matchedKey].ycA = parseFloat($ext(tds[4]).text().trim()) || 0;
            teams[matchedKey].rcF = parseFloat($ext(tds[5]).text().trim()) || 0;
            teams[matchedKey].rcA = parseFloat($ext(tds[6]).text().trim()) || 0;
            teams[matchedKey].psF = parseFloat($ext(tds[7]).text().trim()) || 50;
            teams[matchedKey].psA = parseFloat($ext(tds[8]).text().trim()) || 50;
            teams[matchedKey].cF = parseFloat($ext(tds[9]).text().trim()) || 0;
            teams[matchedKey].cA = parseFloat($ext(tds[10]).text().trim()) || 0;
            teams[matchedKey].stF = parseFloat($ext(tds[11]).text().trim()) || 0;
            teams[matchedKey].stA = parseFloat($ext(tds[12]).text().trim()) || 0;
            teams[matchedKey].sntF = parseFloat($ext(tds[13]).text().trim()) || 0;
            teams[matchedKey].sntA = parseFloat($ext(tds[14]).text().trim()) || 0;
          }
        }
      });
    }

    cache.set(cacheKey, { data: teams, timestamp: Date.now() });
  } catch (err) {
    console.error(`Error parsing league table for table=${tableId}:`, err);
  }

  return teams;
}

/**
 * Fetches upcoming fixtures within max 7 days
 */
export async function getUpcomingFixtures(tableId: string, maxDaysAhead: number = 7): Promise<FixtureMatch[]> {
  const cacheKey = `fixtures_${tableId}_${maxDaysAhead}`;
  const cached = cache.get(cacheKey) as CacheEntry<FixtureMatch[]> | undefined;
  if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
    return cached.data;
  }

  const fixtures: FixtureMatch[] = [];

  try {
    const html = await fetchWithHeaders(`https://thefishy.co.uk/football-fixtures.php?table=${tableId}`);
    const $ = cheerio.load(html);

    let currentDateHeader = '';
    const now = new Date();
    const currentYear = now.getFullYear();

    $('table tr').each((_, tr) => {
      const $tr = $(tr);
      if ($tr.hasClass('success')) {
        const thText = $tr.find('th').first().text().trim();
        if (thText) {
          currentDateHeader = thText;
        }
      } else if ($tr.hasClass('cats')) {
        const time = $tr.find('td').eq(0).text().trim();
        const matchCell = $tr.find('td').eq(1);
        const matchText = matchCell.text().trim();
        const odds1 = parseFloat($tr.find('td.cats2').eq(0).text().trim());
        const oddsX = parseFloat($tr.find('td.cats2').eq(1).text().trim());
        const odds2 = parseFloat($tr.find('td.cats2').eq(2).text().trim());

        const parts = matchText.split(' v ');
        if (parts.length === 2) {
          const homeTeam = parts[0].trim();
          const awayTeam = parts[1].split(/\s{2,}|\n/)[0].trim();

          // Calculate match date
          const matchDate = parseDateHeader(currentDateHeader, currentYear);
          const diffMs = matchDate.getTime() - now.getTime();
          const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));

          // Condition A: partidos no empezados máximo 7 días a la fecha y hora de la consulta
          // We allow matches from today (0) up to maxDaysAhead (e.g. 7 days)
          if (diffDays >= -1 && diffDays <= maxDaysAhead) {
            fixtures.push({
              id: `fix_${tableId}_${fixtures.length + 1}_${homeTeam.replace(/\s+/g, '')}`,
              leagueId: tableId,
              leagueName: '',
              dateRaw: currentDateHeader,
              dateIso: matchDate.toISOString(),
              daysFromNow: Math.max(0, diffDays),
              time: time || '15:00',
              homeTeam,
              awayTeam,
              odds: {
                home: isNaN(odds1) ? null : odds1,
                draw: isNaN(oddsX) ? null : oddsX,
                away: isNaN(odds2) ? null : odds2,
              },
            });
          }
        }
      }
    });

    cache.set(cacheKey, { data: fixtures, timestamp: Date.now() });
  } catch (err) {
    console.error(`Error parsing fixtures for table=${tableId}:`, err);
  }

  return fixtures;
}

/**
 * Fetches finished results up to 30 days prior
 */
export async function getFinishedResults(tableId: string, maxDaysBehind: number = 30): Promise<FinishedMatch[]> {
  const cacheKey = `results_${tableId}_${maxDaysBehind}`;
  const cached = cache.get(cacheKey) as CacheEntry<FinishedMatch[]> | undefined;
  if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
    return cached.data;
  }

  const results: FinishedMatch[] = [];

  try {
    const html = await fetchWithHeaders(`https://thefishy.co.uk/football-results.php?table=${tableId}`);
    const $ = cheerio.load(html);

    let currentDateHeader = '';
    const now = new Date();
    const currentYear = now.getFullYear();

    $('table tr').each((_, tr) => {
      const $tr = $(tr);
      if ($tr.hasClass('success')) {
        const th = $tr.find('th').first().text().trim();
        if (th) currentDateHeader = th;
      } else if ($tr.hasClass('cats') || $tr.find('td.home').length > 0) {
        const time = $tr.find('td').eq(0).text().trim();
        const home = $tr.find('td.home a').text().trim() || $tr.find('td').eq(1).text().trim();
        const scoreRaw = $tr.find('td.catsc a').text().trim() || $tr.find('td.catsc').text().trim();
        const away = $tr.find('td').eq(3).find('a').text().trim() || $tr.find('td').eq(3).text().trim();

        const scoreClean = scoreRaw.replace(/\u2011/g, '-').replace(/&#8209;/g, '-').trim();
        const parts = scoreClean.split('-');

        if (parts.length === 2) {
          const homeGoals = parseInt(parts[0], 10);
          const awayGoals = parseInt(parts[1], 10);

          if (!isNaN(homeGoals) && !isNaN(awayGoals) && home && away) {
            const matchDate = parseDateHeader(currentDateHeader, currentYear);
            const diffMs = now.getTime() - matchDate.getTime();
            const daysAgo = Math.max(0, Math.round(diffMs / (1000 * 60 * 60 * 24)));

            // Condition B: partidos hasta 30 días previos a la fecha y hora de la consulta
            if (daysAgo <= maxDaysBehind) {
              const actualBtts = homeGoals > 0 && awayGoals > 0;
              const totalGoals = homeGoals + awayGoals;
              const actualOver25 = totalGoals > 2.5;

              results.push({
                id: `res_${tableId}_${results.length + 1}_${home.replace(/\s+/g, '')}`,
                leagueId: tableId,
                leagueName: '',
                dateRaw: currentDateHeader,
                dateIso: matchDate.toISOString(),
                daysAgo,
                time: time || '15:00',
                homeTeam: home,
                awayTeam: away,
                score: `${homeGoals}-${awayGoals}`,
                homeGoals,
                awayGoals,
                totalGoals,
                actualBtts,
                actualOver25,
              });
            }
          }
        }
      }
    });

    cache.set(cacheKey, { data: results, timestamp: Date.now() });
  } catch (err) {
    console.error(`Error parsing results for table=${tableId}:`, err);
  }

  return results;
}

/**
 * Fetches all fixtures for the week from https://www.thefishy.net/thisweeksfixtures
 */
export async function getThisWeeksFixtures(): Promise<FixtureMatch[]> {
  const cacheKey = 'this_weeks_fixtures';
  const cached = cache.get(cacheKey) as CacheEntry<FixtureMatch[]> | undefined;
  if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
    return cached.data;
  }

  const fixtures: FixtureMatch[] = [];

  try {
    const html = await fetchWithHeaders('https://www.thefishy.net/thisweeksfixtures');
    const $ = cheerio.load(html);

    let currentDateHeader = 'Wed 11/11';
    let currentLeagueName = 'General';
    const now = new Date();
    const currentYear = now.getFullYear();

    $('table tr').each((_, tr) => {
      const $tr = $(tr);
      const text = $tr.text().trim();

      // Check if row is a date header (e.g. "Wed 11/11", "Wed 11 Nov", "Wednesday", etc.)
      if ($tr.find('th').length > 0 || $tr.hasClass('success') || text.match(/^(mon|tue|wed|thu|fri|sat|sun)\s+\d{1,2}[-/]\d{1,2}/i) || text.match(/^\d{1,2}\/\d{1,2}$/i) || text.toLowerCase() === 'today' || text.toLowerCase() === 'tomorrow') {
        if (text.length < 40 && !text.includes(' v ')) {
          currentDateHeader = text;
        }
      } 
      // Check if row is a league header (e.g. bold text)
      else if (($tr.find('b').length > 0 || $tr.is('b')) && !text.includes(' v ') && text.length > 2 && text.length < 50) {
        currentLeagueName = text;
      }

      // Check if row contains a match (" v ")
      if (text.includes(' v ') && !text.includes('View') && text.length < 150) {
        const parts = text.split(' v ');
        if (parts.length >= 2) {
          const homeRaw = parts[0].trim();
          const awayRaw = parts[1].trim();

          const homeClean = homeRaw.replace(/^(\d{1,2}:\d{2})\s*/, '').replace(/^\d+\s*/, '').trim();
          const awayClean = awayRaw.split(/\s{2,}|\n/)[0].replace(/\s*\(\d+\)$/, '').replace(/📺|💻/g, '').trim();

          let time = '19:45';
          const timeMatch = homeRaw.match(/\d{1,2}:\d{2}/);
          if (timeMatch) {
            time = timeMatch[0];
          }

          const matchDate = parseDateHeader(currentDateHeader, currentYear);
          const diffMs = matchDate.getTime() - now.getTime();
          const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));

          const odds1 = parseFloat($tr.find('td.cats2').eq(0).text().trim()) || null;
          const oddsX = parseFloat($tr.find('td.cats2').eq(1).text().trim()) || null;
          const odds2 = parseFloat($tr.find('td.cats2').eq(2).text().trim()) || null;

          if (homeClean && awayClean && homeClean.length < 40 && awayClean.length < 40) {
            const exists = fixtures.some(f => f.homeTeam.toLowerCase() === homeClean.toLowerCase() && f.awayTeam.toLowerCase() === awayClean.toLowerCase());
            if (!exists) {
              fixtures.push({
                id: `twf_${fixtures.length + 1}_${homeClean.replace(/\s+/g, '')}`,
                leagueId: 'thisweek',
                leagueName: currentLeagueName || 'General',
                dateRaw: currentDateHeader || 'Wed 11/11',
                dateIso: matchDate.toISOString(),
                daysFromNow: Math.max(0, diffDays),
                time,
                homeTeam: homeClean,
                awayTeam: awayClean,
                odds: { home: odds1, draw: oddsX, away: odds2 },
              });
            }
          }
        }
      }
    });

    if (fixtures.length > 0) {
      cache.set(cacheKey, { data: fixtures, timestamp: Date.now() });
    }
  } catch (err) {
    console.error('Error fetching https://www.thefishy.net/thisweeksfixtures:', err);
  }

  return fixtures;
}

/**
 * Clear cache for force reload
 */
export function clearScraperCache(): void {
  cache.clear();
}

