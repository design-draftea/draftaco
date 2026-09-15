/**
 * Map de logos de times via CDN do TheSportsDB.
 *
 * Por que TheSportsDB:
 *  - CDN público (`r2.thesportsdb.com`) com CORS aberto — funciona em browser
 *  - PNGs nativos (não trigam o ORB do Chrome como o Wikimedia)
 *  - Sem cadastro nem API key para baixar os badges
 *  - URLs estáveis, cacheadas pelo browser
 *
 * Como adicionar um time novo:
 *  1. Acessar `https://www.thesportsdb.com/api/v1/json/3/searchteams.php?t=NomeDoTime`
 *  2. Copiar o valor de `strBadge` da resposta JSON
 *  3. Adicionar abaixo na chave correspondente ao nome usado no app
 *
 * Para times de campeonato específico:
 *  `https://www.thesportsdb.com/api/v1/json/3/search_all_teams.php?l=NomeDaLiga`
 */

export const TEAM_LOGOS: Record<string, string> = {
  // ─── Brasil ───
  'Flamengo':         'https://r2.thesportsdb.com/images/media/team/badge/syptwx1473538074.png',
  'Cruzeiro':         'https://r2.thesportsdb.com/images/media/team/badge/upsvvu1473538059.png',
  'Internacional':    'https://r2.thesportsdb.com/images/media/team/badge/yprvxx1473538097.png',
  'Bragantino':       'https://r2.thesportsdb.com/images/media/team/badge/2p7tl41701423595.png',
  'Mirassol':         'https://r2.thesportsdb.com/images/media/team/badge/pw8uo11765900737.png',
  'São Paulo':        'https://r2.thesportsdb.com/images/media/team/badge/sxpupx1473538135.png',
  'Palmeiras':        'https://r2.thesportsdb.com/images/media/team/badge/vsqwqp1473538105.png',
  'Fluminense':       'https://r2.thesportsdb.com/images/media/team/badge/stvvwp1473538082.png',
  'Botafogo':         'https://r2.thesportsdb.com/images/media/team/badge/bs5mbw1733004596.png',
  'Bahia':            'https://r2.thesportsdb.com/images/media/team/badge/xuvtsv1473539308.png',
  'Atl. Mineiro':     'https://r2.thesportsdb.com/images/media/team/badge/x5lixs1743742872.png',
  'Atlético Mineiro': 'https://r2.thesportsdb.com/images/media/team/badge/x5lixs1743742872.png',
  'Atlético-MG':      'https://r2.thesportsdb.com/images/media/team/badge/x5lixs1743742872.png',
  'Santos':           'https://r2.thesportsdb.com/images/media/team/badge/j8xk9g1679447486.png',
  'Caxias do Sul':    'https://r2.thesportsdb.com/images/media/team/badge/o4jhxw1625417717.png',
  'Vitória':          'https://r2.thesportsdb.com/images/media/team/badge/tysrrx1473538156.png',
  'Sport':            'https://r2.thesportsdb.com/images/media/team/badge/tyrbls1545421563.png',
  'Grêmio':           'https://r2.thesportsdb.com/images/media/team/badge/uvpwyt1473538089.png',
  'Juventude':        'https://r2.thesportsdb.com/images/media/team/badge/1ntter1766506778.png',
  'Fortaleza':        'https://r2.thesportsdb.com/images/media/team/badge/tosmdr1532853458.png',
  'Ceará':            'https://r2.thesportsdb.com/images/media/team/badge/rxxvyp1464886685.png',

  // ─── Espanha ───
  'Atlético Madrid':  'https://r2.thesportsdb.com/images/media/team/badge/0ulh3q1719984315.png',
  'Real Madrid':      'https://r2.thesportsdb.com/images/media/team/badge/vwvwrw1473502969.png',
  'Barcelona':        'https://r2.thesportsdb.com/images/media/team/badge/wq9sir1639406443.png',
  'Getafe':           'https://r2.thesportsdb.com/images/media/team/badge/eyh2891655594452.png',
  'Elche':            'https://r2.thesportsdb.com/images/media/team/badge/e4vaw51655594332.png',
  'Alavés':           'https://r2.thesportsdb.com/images/media/team/badge/mfn99h1734673842.png',
  'Espanyol':         'https://r2.thesportsdb.com/images/media/team/badge/867nzz1681703222.png',
  'Mallorca':         'https://r2.thesportsdb.com/images/media/team/badge/ssptsx1473503730.png',
  'Levante':          'https://r2.thesportsdb.com/images/media/team/badge/xwtxsx1473503739.png',
  'Sevilla':          'https://r2.thesportsdb.com/images/media/team/badge/vpsqqx1473502977.png',
  'Villarreal':       'https://r2.thesportsdb.com/images/media/team/badge/vrypqy1473503073.png',

  // ─── Itália ───
  'Inter':            'https://r2.thesportsdb.com/images/media/team/badge/ryhu6d1617113103.png',
  'Napoli':           'https://r2.thesportsdb.com/images/media/team/badge/l8qyxv1742982541.png',

  // ─── França ───
  'PSG':              'https://r2.thesportsdb.com/images/media/team/badge/rwqrrq1473504808.png',
  'Paris Saint-Germain': 'https://r2.thesportsdb.com/images/media/team/badge/rwqrrq1473504808.png',
  'Lyon':             'https://r2.thesportsdb.com/images/media/team/badge/blk9771656932845.png',

  // ─── Inglaterra ───
  'Newcastle':        'https://r2.thesportsdb.com/images/media/team/badge/lhwuiz1621593302.png',
  'Aston Villa':      'https://r2.thesportsdb.com/images/media/team/badge/jykrpv1717309891.png',
  'Nottingham':       'https://r2.thesportsdb.com/images/media/team/badge/bk4qjs1546440351.png',
  'Liverpool':        'https://r2.thesportsdb.com/images/media/team/badge/kfaher1737969724.png',
  'Manchester City':  'https://r2.thesportsdb.com/images/media/team/badge/vwpvry1467462651.png',
  'Man. City':        'https://r2.thesportsdb.com/images/media/team/badge/vwpvry1467462651.png',
  'Arsenal':          'https://r2.thesportsdb.com/images/media/team/badge/uyhbfe1612467038.png',
  'Chelsea':          'https://r2.thesportsdb.com/images/media/team/badge/yvwvtu1448813215.png',
  'Brighton':         'https://r2.thesportsdb.com/images/media/team/badge/ywypts1448810904.png',
  'West Ham':         'https://r2.thesportsdb.com/images/media/team/badge/yutyxs1467459956.png',
  'Leeds':            'https://r2.thesportsdb.com/images/media/team/badge/jcgrml1756649030.png',
  'Burnley':          'https://r2.thesportsdb.com/images/media/team/badge/ql7nl31686893820.png',
  'Tottenham':        'https://r2.thesportsdb.com/images/media/team/badge/dfyfhl1604094109.png',
  'Wolves':           'https://r2.thesportsdb.com/images/media/team/badge/u9qr031621593327.png',

  // ─── Alemanha — Bundesliga ───
  'Bayern':           'https://r2.thesportsdb.com/images/media/team/badge/01ogkh1716960412.png',
  'B. Leverkusen':    'https://r2.thesportsdb.com/images/media/team/badge/3x9k851726760113.png',
  'Bayer Leverkusen': 'https://r2.thesportsdb.com/images/media/team/badge/3x9k851726760113.png',
  'Wolfsburg':        'https://r2.thesportsdb.com/images/media/team/badge/07kp421599680274.png',
  'Eintracht':        'https://r2.thesportsdb.com/images/media/team/badge/rurwpy1473453269.png',
  'Augsburg':         'https://r2.thesportsdb.com/images/media/team/badge/xqyyvq1473453233.png',
  'Hamburger':        'https://r2.thesportsdb.com/images/media/team/badge/tvtppt1473453296.png',
  'B. Dortmund':      'https://r2.thesportsdb.com/images/media/team/badge/tqo8ge1716960353.png',
  'Borussia Dortmund':'https://r2.thesportsdb.com/images/media/team/badge/tqo8ge1716960353.png',
  'RB Leipzig':       'https://r2.thesportsdb.com/images/media/team/badge/zjgapo1594244951.png',

  // ─── Portugal / Turquia / Grécia / Croácia / Holanda ───
  'Porto':            'https://r2.thesportsdb.com/images/media/team/badge/xu47rb1628855600.png',
  'Fenerbahçe':       'https://r2.thesportsdb.com/images/media/team/badge/twxxvs1448199691.png',
  'Panathinaikos':    'https://r2.thesportsdb.com/images/media/team/badge/vtpwwt1448208397.png',
  'Dinamo':           'https://r2.thesportsdb.com/images/media/team/badge/araidi1579955395.png',
  'Benfica':          'https://r2.thesportsdb.com/images/media/team/badge/0pywy21662316682.png',
  'Ajax':             'https://r2.thesportsdb.com/images/media/team/badge/zg9tii1755495289.png',

  // ─── Argentina ───
  'Boca Juniors':     'https://r2.thesportsdb.com/images/media/team/badge/bm7krb1775741582.png',
  'Argentinos Jrs':   'https://r2.thesportsdb.com/images/media/team/badge/uqfjuo1769234850.png',
  'Racing':           'https://r2.thesportsdb.com/images/media/team/badge/vi4mu41695734959.png',
  'River Plate':      'https://r2.thesportsdb.com/images/media/team/badge/03dmi31645539717.png',
  'San Lorenzo':      'https://r2.thesportsdb.com/images/media/team/badge/37wke41775741605.png',
  'Córdoba':          'https://r2.thesportsdb.com/images/media/team/badge/0twgzi1517768087.png',
  'Estudiantes de La Plata': 'https://r2.thesportsdb.com/images/media/team/badge/pf08dq1760634366.png',
  'Platense':         'https://r2.thesportsdb.com/images/media/team/badge/lbs14n1769317149.png',

  // ─── Libertadores ───
  'Universidad Católica': 'https://r2.thesportsdb.com/images/media/team/badge/h2pcuc1602188028.png',
  'Deportes Tolima':  'https://r2.thesportsdb.com/images/media/team/badge/4bscjt1766423328.png',
  'Independiente del Valle': 'https://r2.thesportsdb.com/images/media/team/badge/qku0lv1737622736.png',
  'Coquimbo Unido':   'https://r2.thesportsdb.com/images/media/team/badge/b2cnht1602186172.png',
  'Bolívar':          'https://r2.thesportsdb.com/images/media/team/badge/0o5jrz1579798499.png',
  'Cerro Porteño':    'https://r2.thesportsdb.com/images/media/team/badge/xkxqtz1652126507.png',
  'LDU Quito':        'https://r2.thesportsdb.com/images/media/team/badge/5tf5ch1736404372.png',
  'Atlético Nacional': 'https://r2.thesportsdb.com/images/media/team/badge/efl4o41576157720.png',
  'Peñarol':          'https://r2.thesportsdb.com/images/media/team/badge/uuwpux1473541171.png',
  'Alianza Lima':     'https://r2.thesportsdb.com/images/media/team/badge/y5wov41580040189.png',
  'Universitario':    'https://r2.thesportsdb.com/images/media/team/badge/xt290m1603137966.png',
  'Sporting Cristal': 'https://r2.thesportsdb.com/images/media/team/badge/ive4ya1766423194.png',
  'Barcelona SC':     'https://r2.thesportsdb.com/images/media/team/badge/c5yr001653075296.png',
  'Deportivo Táchira': 'https://r2.thesportsdb.com/images/media/team/badge/bdwm1e1734241932.png',
  'Carabobo':         'https://r2.thesportsdb.com/images/media/team/badge/yeu8bn1639000596.png',
  'Melgar':           'https://r2.thesportsdb.com/images/media/team/badge/0puqm41765861529.png',

  // ─── EUA — MLS ───
  'Inter Miami':      'https://r2.thesportsdb.com/images/media/team/badge/m4it3e1602103647.png',
  'Whitecaps':        'https://r2.thesportsdb.com/images/media/team/badge/tpwxpy1473536521.png',
  'Cincinnati':       'https://r2.thesportsdb.com/images/media/team/badge/vvhsqc1707631046.png',
  'Chicago Fire':     'https://r2.thesportsdb.com/images/media/team/badge/8xuc781639493166.png',
  'Nashville':        'https://r2.thesportsdb.com/images/media/team/badge/znrwt71602103062.png',
  'New York City':    'https://r2.thesportsdb.com/images/media/team/badge/m9vis71735140655.png',
  'Seattle Sounders': 'https://r2.thesportsdb.com/images/media/team/badge/2dy5cx1706711036.png',
  'LA Galaxy':        'https://r2.thesportsdb.com/images/media/team/badge/ysyysr1420227188.png',
  'Atlanta United':   'https://r2.thesportsdb.com/images/media/team/badge/ej091x1602103070.png',
  'Portland Timbers': 'https://r2.thesportsdb.com/images/media/team/badge/skm30j1557953559.png',
  'Orlando City':     'https://r2.thesportsdb.com/images/media/team/badge/qyppxw1423832326.png',
  'FC Dallas':        'https://r2.thesportsdb.com/images/media/team/badge/vxy8xy1602103187.png',
  'Houston Dynamo':   'https://r2.thesportsdb.com/images/media/team/badge/yvz9dq1707631352.png',
  'Charlotte FC':     'https://r2.thesportsdb.com/images/media/team/badge/b6p4uz1595434047.png',

  // ─── NBA ───
  'Jazz':             'https://r2.thesportsdb.com/images/media/team/badge/9v9c5p1751703267.png',
  'Utah Jazz':        'https://r2.thesportsdb.com/images/media/team/badge/9v9c5p1751703267.png',
  'Thunder':          'https://r2.thesportsdb.com/images/media/team/badge/27v8861746610370.png',
  'Oklahoma City Thunder': 'https://r2.thesportsdb.com/images/media/team/badge/27v8861746610370.png',
  'Knicks':           'https://r2.thesportsdb.com/images/media/team/badge/wyhpuf1511810435.png',
  'New York Knicks':  'https://r2.thesportsdb.com/images/media/team/badge/wyhpuf1511810435.png',
  'Magic':            'https://r2.thesportsdb.com/images/media/team/badge/sjsv3b1748974231.png',
  'Orlando Magic':    'https://r2.thesportsdb.com/images/media/team/badge/sjsv3b1748974231.png',
  'Bulls':            'https://r2.thesportsdb.com/images/media/team/badge/yk7swg1547214677.png',
  'Chicago Bulls':    'https://r2.thesportsdb.com/images/media/team/badge/yk7swg1547214677.png',
  'Heat':             'https://r2.thesportsdb.com/images/media/team/badge/5v67x51547214763.png',
  'Miami Heat':       'https://r2.thesportsdb.com/images/media/team/badge/5v67x51547214763.png',
  'Warriors':         'https://r2.thesportsdb.com/images/media/team/badge/irobi61565197527.png',
  'Lakers':           'https://r2.thesportsdb.com/images/media/team/badge/d8uoxw1714254511.png',
  'Pistons':          'https://r2.thesportsdb.com/images/media/team/badge/lg7qrc1621594751.png',
  'Cavaliers':        'https://r2.thesportsdb.com/images/media/team/badge/tys75k1664478652.png',
  '76ers':            'https://r2.thesportsdb.com/images/media/team/badge/71545f1518464849.png',
  'Celtics':          'https://r2.thesportsdb.com/images/media/team/badge/4j85bn1667936589.png',
  'Nuggets':          'https://r2.thesportsdb.com/images/media/team/badge/8o8j5k1546016274.png',
  'Suns':             'https://r2.thesportsdb.com/images/media/team/badge/qrtuxq1422919040.png',
  'Mavericks':        'https://r2.thesportsdb.com/images/media/team/badge/yqrxrs1420568796.png',
  'Spurs':            'https://r2.thesportsdb.com/images/media/team/badge/obucan1611859537.png',
  'Clippers':         'https://r2.thesportsdb.com/images/media/team/badge/3gtb8s1719303125.png',
  'Kings':            'https://r2.thesportsdb.com/images/media/team/badge/5d3dpz1611859587.png',

  // ─── NFL ───
  'KC Chiefs':             'https://r2.thesportsdb.com/images/media/team/badge/n58gp51784720929.png',
  'Kansas City Chiefs':    'https://r2.thesportsdb.com/images/media/team/badge/n58gp51784720929.png',
  'MIA Dolphins':          'https://r2.thesportsdb.com/images/media/team/badge/e803xt1784722221.png',
  'Miami Dolphins':        'https://r2.thesportsdb.com/images/media/team/badge/e803xt1784722221.png',
  'PIT Steelers':          'https://r2.thesportsdb.com/images/media/team/badge/2975411515853129.png',
  'Pittsburgh Steelers':   'https://r2.thesportsdb.com/images/media/team/badge/2975411515853129.png',
  'CIN Bengals':           'https://r2.thesportsdb.com/images/media/team/badge/h1ce8y1784717263.png',
  'Cincinnati Bengals':    'https://r2.thesportsdb.com/images/media/team/badge/h1ce8y1784717263.png',
  'BUF Bills':             'https://r2.thesportsdb.com/images/media/team/badge/j4r1tn1784714823.png',
  'Buffalo Bills':         'https://r2.thesportsdb.com/images/media/team/badge/j4r1tn1784714823.png',
  'NE Patriots':           'https://r2.thesportsdb.com/images/media/team/badge/xtwxyt1421431860.png',
  'New England Patriots':  'https://r2.thesportsdb.com/images/media/team/badge/xtwxyt1421431860.png',
  'PHI Eagles':            'https://r2.thesportsdb.com/images/media/team/badge/pnpybf1515852421.png',
  'Philadelphia Eagles':   'https://r2.thesportsdb.com/images/media/team/badge/pnpybf1515852421.png',
  'DAL Cowboys':           'https://r2.thesportsdb.com/images/media/team/badge/76ew3c1784718447.png',
  'Dallas Cowboys':        'https://r2.thesportsdb.com/images/media/team/badge/76ew3c1784718447.png',
}

/**
 * Retorna a URL do escudo do time, ou um fallback caso não esteja mapeado.
 * @param teamName - nome do time como aparece nos dados do jogo
 * @param fallback - imagem alternativa (geralmente o PNG local) caso o time não esteja mapeado
 */
export function getTeamLogo(teamName: string, fallback = ''): string {
  return TEAM_LOGOS[teamName] ?? fallback
}
