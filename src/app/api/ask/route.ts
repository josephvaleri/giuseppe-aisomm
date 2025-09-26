import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getMLInference } from '@/lib/ml/infer'
import { loadEntityDictionaries, extractQuestionFeatures, extractRetrievalFeatures, extractRouteFeatures } from '@/lib/ml/features'
import { searchDocuments, synthesizeFromDB } from '@/lib/rag/retrieval'
import { GIUSEPPE_SYSTEM_PROMPT, getRandomItalianStarter, buildUserPrompt } from '@/lib/giuseppe/persona'

// Function to check if a question is wine-related
function isWineTopic(question: string): boolean {
  const lowerQuestion = question.toLowerCase()
  
  // Comprehensive wine-related keywords
  const wineKeywords = [
    // Basic wine terms
    'wine', 'wines', 'grape', 'grapes', 'vineyard', 'vineyards',
    'vintage', 'vintages', 'winery', 'wineries', 'sommelier',
    'appellation', 'appellations', 'terroir', 'fermentation',
    'tannin', 'tannins', 'acidity', 'alcohol', 'bottle', 'bottles',
    'cork', 'corks', 'decant', 'decanting', 'taste', 'tasting',
    'aroma', 'aromas', 'bouquet', 'flavor', 'flavors',
    'red wine', 'white wine', 'rosé', 'rose', 'sparkling',
    
    // Wine styles
    'champagne', 'prosecco', 'cava', 'sherry', 'port', 'madeira',
    'ice wine', 'dessert wine', 'fortified wine', 'natural wine',
    
    // Major grape varieties
    'chardonnay', 'cabernet', 'merlot', 'pinot', 'sauvignon',
    'riesling', 'syrah', 'shiraz', 'malbec', 'tempranillo',
    'sangiovese', 'nebbiolo', 'barbera', 'dolcetto',
    'vermentino', 'pinot grigio', 'pinot gris', 'gewürztraminer',
    'sagrantino', 'montefalco', 'montepulciano', 'agiorgitiko',
    'moschofilero', 'assyrtico', 'xinomavro', 'mavrodaphne',
    'limnio', 'negroamaro', 'primitivo', 'nero d\'avola',
    'corvina', 'rondinella', 'molinara', 'lagrein', 'schiava',
    'vernaccia', 'trebbiano', 'moscato', 'brachetto', 'freisa',
    'grignolino', 'bonarda', 'cortese', 'favorita', 'erbaluce',
    'glera', 'cortese', 'falanghina', 'fiano', 'greco',
    'canaiolo', 'colorino', 'ciliegiolo', 'pugnitello',
    'albarino', 'alvarinho', 'godello', 'mencia', 'bobal',
    'garnacha', 'grenache', 'mourvedre', 'monastrell',
    'carignan', 'cinsault', 'muscat', 'viognier', 'marsanne',
    'roussanne', 'grenache blanc', 'picpoul', 'clairette',
    'petit manseng', 'gros manseng', 'chenin blanc',
    'semillon', 'sauvignon blanc', 'sauvignon gris',
    'pinot blanc', 'pinot meunier', 'pinot noir',
    'cabernet franc', 'cabernet sauvignon', 'petit verdot',
    'carménère', 'merlot', 'malbec', 'tannat', 'côt',
    'gamay', 'beaujolais', 'cinsault', 'mourvèdre',
    
    // Wine regions and countries
    'italy', 'italian', 'france', 'french', 'spain', 'spanish',
    'germany', 'german', 'portugal', 'portuguese', 'greece', 'greek',
    'australia', 'australian', 'chile', 'chilean', 'argentina',
    'argentine', 'south africa', 'south african', 'new zealand',
    'usa', 'united states', 'american', 'california', 'californian',
    'oregon', 'washington', 'canada', 'canadian', 'austria',
    'austrian', 'hungary', 'hungarian', 'romania', 'romanian',
    'bulgaria', 'bulgarian', 'croatia', 'croatian', 'slovenia',
    'slovenian', 'serbia', 'serbian', 'moldova', 'moldovan',
    'georgia', 'georgian', 'turkey', 'turkish', 'lebanon',
    'lebanese', 'israel', 'israeli', 'japan', 'japanese',
    'china', 'chinese', 'india', 'indian', 'brazil', 'brazilian',
    'mexico', 'mexican', 'uruguay', 'uruguayan', 'peru', 'peruvian',
    
    // Italian regions and appellations
    'tuscany', 'tuscan', 'piedmont', 'piedmontese', 'umbria',
    'umbrian', 'lazio', 'laziale', 'marche', 'marches', 'abruzzo',
    'abruzzese', 'puglia', 'pugliese', 'campania', 'campanian',
    'sicily', 'sicilian', 'sardinia', 'sardinian', 'lombardy',
    'lombard', 'veneto', 'venetian', 'friuli', 'friulian',
    'emilia-romagna', 'emilian', 'liguria', 'ligurian',
    'chianti', 'chianti classico', 'brunello', 'brunello di montalcino',
    'montalcino', 'barolo', 'barbaresco', 'amarone', 'valpolicella',
    'soave', 'bardolino', 'lugana', 'prosecco', 'franciacorta',
    'vino nobile di montepulciano', 'carmignano', 'bolgheri',
    'sassicaia', 'super tuscan', 'vernaccia di san gimignano',
    'sangiovese di romagna', 'albana di romagna', 'romagna',
    'colli bolognesi', 'lambrusco', 'sangiovese', 'nerello mascalese',
    'nerello cappuccio', 'catarratto', 'inzolia', 'grillo',
    'carricante', 'perricone', 'frappato', 'nera d\'avola',
    'primitivo', 'negroamaro', 'malvasia nera', 'susumaniello',
    'aglianico', 'falanghina', 'fiano', 'greco di tufo',
    'coda di volpe', 'pallagrello', 'asiago', 'piedirosso',
    'sciascinoso', 'tintilia', 'cannonau', 'vermentino',
    'carignano', 'nuragus', 'monica', 'vernaccia di oristano',
    'vitovska', 'ribolla gialla', 'friulano', 'refosco',
    'schioppettino', 'pignolo', 'tazzelenghe', 'verduzzo',
    'ramandolo', 'picolit', 'moscato', 'moscato d\'asti',
    'brachetto d\'acqui', 'barbera', 'barbera d\'asti',
    'dolcetto', 'dolcetto d\'alba', 'nebbiolo', 'freisa',
    'grignolino', 'ruche', 'bonarda', 'croàtina', 'vespolina',
    'gattinara', 'ghemme', 'lessona', 'bramaterra', 'carema',
    'canavese', 'erbalus', 'tocai friulano', 'collio', 'colli orientali',
    
    // French regions and appellations
    'burgundy', 'bourgogne', 'côte d\'or', 'côte de nuits',
    'côte de beaune', 'chablis', 'maconnais', 'beaujolais',
    'bordeaux', 'médoc', 'pauillac', 'margaux', 'saint-julien',
    'saint-estèphe', 'listrac', 'moulis', 'haut-médoc',
    'graves', 'pessac-léognan', 'sauternes', 'barsac',
    'saint-émilion', 'pomerol', 'lalande-de-pomerol',
    'fronsac', 'canon-fronsac', 'côtes de bordeaux',
    'entre-deux-mers', 'cadillac', 'loupiac', 'sainte-croix-du-mont',
    'champagne', 'côte des blancs', 'montagne de reims',
    'vallée de la marne', 'aube', 'côte des bar', 'côteaux champenois',
    'loire', 'sancerre', 'pouilly-fumé', 'quincy', 'reuilly',
    'menetou-salon', 'coteaux du giennois', 'orléans',
    'cheverny', 'cour-cheverny', 'valençay', 'touraine',
    'vouvray', 'montlouis', 'chinon', 'bourgueil', 'saint-nicolas-de-bourgueil',
    'anjou', 'saumur', 'coteaux du layon', 'bonnezeaux',
    'quarts de chaume', 'savennières', 'muscadet', 'gros plant',
    'fiefs vendéens', 'coteaux d\'ancenis', 'fiefs vendéens',
    'rhône', 'côte-rôtie', 'condrieu', 'château-grillet',
    'saint-joseph', 'cornas', 'saint-péray', 'hermitage',
    'crozes-hermitage', 'gigondas', 'vacqueyras', 'châteauneuf-du-pape',
    'lirac', 'tavel', 'côtes du rhône', 'côtes du rhône villages',
    'ventoux', 'luberon', 'costières de nîmes', 'coteaux du tricastin',
    'grignan-les-adhémar', 'diois', 'clairette de die', 'crémant de die',
    'alsace', 'crémat d\'alsace', 'alsace grand cru', 'klevner',
    'gewurztraminer', 'tokay pinot gris', 'riesling', 'muscat',
    'sylvaner', 'auxerrois', 'pinot blanc', 'pinot noir',
    'chasselas', 'savagnin', 'jura', 'arbois', 'l\'étoile',
    'côtes du jura', 'château-chalon', 'macvin du jura',
    'crémant du jura', 'savoie', 'bugey', 'seyssel', 'ayze',
    'crépy', 'abymes', 'aiguebelle', 'chautagne', 'marin',
    'monterminod', 'ripailles', 'saint-jeoire-prieuré', 'savoie',
    'southwest', 'sud-ouest', 'bergerac', 'côtes de bergerac',
    'monbazillac', 'côtes de duras', 'buzet', 'côtes du marmandais',
    'cahors', 'côtes du lot', 'gaillac', 'côtes de millau',
    'marcillac', 'entraygues et du fel', 'estaing', 'côtes de saint-mont',
    'madiran', 'pacherenc du vic-bilh', 'jurançon', 'côtes de saint-mont',
    'tursan', 'irouléguy', 'béarn', 'côtes du roussillon',
    'côtes du roussillon villages', 'collioure', 'banyuls',
    'maury', 'muscat de rivesaltes', 'rivesaltes', 'côtes catalanes',
    'côtes du roussillon', 'corbières', 'corbières-boutenac',
    'fitou', 'minervois', 'minervois-la-livinière', 'languedoc',
    'coteaux du languedoc', 'pic saint-loup', 'terrasses du larzac',
    'grès de montpellier', 'la clape', 'quatourze', 'pézenas',
    'saint-chinian', 'faugères', 'côtes de la malepère',
    'limoux', 'blanquette de limoux', 'crémant de limoux',
    'clairette du languedoc', 'muscat de frontignan',
    'muscat de mireval', 'muscat de lunel', 'muscat de saint-jean-de-minervois',
    'costières de nîmes', 'duché d\'uzès', 'coteaux du pont du gard',
    'côtes du vivarais', 'côtes du rhône', 'ventoux', 'luberon',
    'côtes du ventoux', 'coteaux du tricastin', 'grignan-les-adhémar',
    'diois', 'clairette de die', 'crémant de die', 'coteaux de die',
    'châtillon-en-diois', 'côtes du rhône', 'côtes du rhône villages',
    
    // Spanish regions and appellations
    'rioja', 'ribera del duero', 'ribera del guadiana', 'la mancha',
    'valencia', 'catalonia', 'catalunya', 'penedès', 'priorat',
    'montsant', 'conca de barberà', 'costers del segre',
    'terra alta', 'tarragona', 'alella', 'ampurdán-costa brava',
    'cava', 'jerez', 'xérès', 'sherry', 'manzanilla', 'montilla-moriles',
    'condado de huelva', 'málaga', 'sierras de málaga',
    'rías baixas', 'ribeiro', 'valdeorras', 'bierzo',
    'toro', 'rueda', 'cigales', 'arribes', 'tierra de león',
    'bajo aragón', 'campo de borja', 'calatayud', 'carinena',
    'somontano', 'navarra', 'utiel-requena', 'alicante',
    'jumilla', 'yecla', 'bullas', 'almansa', 'méntrida',
    'vino de la tierra de castilla', 'vino de la tierra de extremadura',
    'vino de la tierra de andalucía', 'vino de la tierra de canarias',
    'vino de la tierra de las islas baleares', 'vino de la tierra de murcia',
    'vino de la tierra de valencia', 'vino de la tierra de aragón',
    'vino de la tierra de castilla y león', 'vino de la tierra de galicia',
    'vino de la tierra de asturias', 'vino de la tierra de cantabria',
    'vino de la tierra de país vasco', 'vino de la tierra de la rioja',
    'vino de la tierra de navarra', 'vino de la tierra de aragón',
    'vino de la tierra de cataluña', 'vino de la tierra de valencia',
    'vino de la tierra de murcia', 'vino de la tierra de andalucía',
    'vino de la tierra de extremadura', 'vino de la tierra de castilla-la mancha',
    'vino de la tierra de madrid', 'vino de la tierra de castilla y león',
    'vino de la tierra de galicia', 'vino de la tierra de asturias',
    'vino de la tierra de cantabria', 'vino de la tierra de país vasco',
    'vino de la tierra de la rioja', 'vino de la tierra de navarra',
    
    // German regions and appellations
    'mosel', 'mosel-saar-ruwer', 'rheingau', 'rheinhessen',
    'pfalz', 'baden', 'württemberg', 'franken', 'franconia',
    'saale-unstrut', 'sachsen', 'saxony', 'ahe', 'mittlerhein',
    'nahe', 'hessische bergstraße', 'kraichgau', 'badische bergstraße',
    'tuniberg', 'kaiserstuhl', 'markgräflerland', 'ortswein',
    'grosses gewächs', 'vdp', 'erste lage', 'grosse lage',
    'spätlese', 'auslese', 'beerenauslese', 'trockenbeerenauslese',
    'eiswein', 'trocken', 'halbtrocken', 'feinherb', 'lieblich',
    'süss', 'kabinett', 'spätlese', 'auslese', 'beerenauslese',
    'trockenbeerenauslese', 'eiswein', 'qualitätswein',
    'prädikatswein', 'landwein', 'tafelwein', 'deutscher wein',
    'sekt', 'sect', 'weinbrand', 'obstbrand', 'korn',
    'kümmel', 'jägermeister', 'underberg', 'berentzen',
    'asbach', 'metaxa', 'ouzo', 'raki', 'tsipouro',
    'mastika', 'arak', 'arak', 'sambuca', 'amaretto',
    'frangelico', 'nocello', 'disaronno', 'galliano',
    'fernet-branca', 'campari', 'aperol', 'cynar',
    'suze', 'salers', 'amer picon', 'lillet', 'dubonnet',
    'st. raphaël', 'byrrh', 'bonal', 'cap corse', 'quinquina',
    'cocchi', 'carpano', 'martini', 'cinzano', 'gancia',
    'riccadonna', 'pernod', 'ricard', 'pastis', 'pastis 51',
    'henry bardouin', 'casanis', 'duval', 'janot', 'granier',
    'pastis du moustier', 'pastis de marseille', 'pastis de provence',
    
    // Food pairing terms
    'pair', 'pairs', 'pairing', 'pairings', 'goes with',
    'matches', 'matching', 'complement', 'complements',
    'cheese', 'meat', 'fish', 'seafood', 'pasta', 'pizza',
    'salmon', 'steak', 'chicken', 'pork', 'beef', 'lamb',
    'duck', 'game', 'venison', 'wild boar', 'rabbit',
    'mushrooms', 'truffles', 'foie gras', 'caviar',
    'chocolate', 'dessert', 'fruit', 'nuts', 'herbs',
    'spices', 'sauce', 'gravy', 'marinade', 'rub',
    'seasoning', 'salt', 'pepper', 'garlic', 'onion',
    'tomato', 'basil', 'oregano', 'thyme', 'rosemary',
    'sage', 'parsley', 'cilantro', 'dill', 'chives',
    'tarragon', 'fennel', 'anise', 'cinnamon', 'cloves',
    'nutmeg', 'allspice', 'juniper', 'bay leaves',
    'vanilla', 'lavender', 'honey', 'maple syrup',
    'balsamic', 'olive oil', 'butter', 'cream', 'milk',
    'yogurt', 'sour cream', 'crème fraîche', 'mascarpone',
    'ricotta', 'mozzarella', 'parmesan', 'pecorino',
    'gorgonzola', 'stilton', 'roquefort', 'brie', 'camembert',
    'gruyère', 'emmental', 'cheddar', 'gouda', 'edam',
    'provolone', 'asiago', 'fontina', 'taleggio', 'gorgonzola',
    'stilton', 'roquefort', 'brie', 'camembert', 'munster',
    'limburger', 'havarti', 'jarlsberg', 'swiss', 'colby',
    'monterey jack', 'pepper jack', 'muenster', 'port salut',
    'laughing cow', 'babybel', 'string cheese', 'cottage cheese',
    'cream cheese', 'goat cheese', 'sheep cheese', 'buffalo mozzarella',
    'burrata', 'stracciatella', 'scamorza', 'caciocavallo',
    'provolone', 'pecorino romano', 'pecorino sardo', 'pecorino siciliano',
    'pecorino toscano', 'parmigiano reggiano', 'grana padano',
    'asiago', 'fontina', 'taleggio', 'gorgonzola', 'stracchino',
    'robiola', 'crescenza', 'stracchino', 'quartirolo', 'taleggio',
    'gorgonzola', 'stilton', 'roquefort', 'brie', 'camembert',
    'munster', 'limburger', 'havarti', 'jarlsberg', 'swiss',
    'colby', 'monterey jack', 'pepper jack', 'muenster',
    'port salut', 'laughing cow', 'babybel', 'string cheese',
    'cottage cheese', 'cream cheese', 'goat cheese', 'sheep cheese',
    'buffalo mozzarella', 'burrata', 'stracciatella', 'scamorza',
    'caciocavallo', 'provolone', 'pecorino romano', 'pecorino sardo',
    'pecorino siciliano', 'pecorino toscano', 'parmigiano reggiano',
    'grana padano', 'asiago', 'fontina', 'taleggio', 'gorgonzola',
    'stracchino', 'robiola', 'crescenza', 'stracchino', 'quartirolo',
    'taleggio', 'gorgonzola', 'stilton', 'roquefort', 'brie',
    'camembert', 'munster', 'limburger', 'havarti', 'jarlsberg',
    'swiss', 'colby', 'monterey jack', 'pepper jack', 'muenster',
    'port salut', 'laughing cow', 'babybel', 'string cheese',
    'cottage cheese', 'cream cheese', 'goat cheese', 'sheep cheese',
    'buffalo mozzarella', 'burrata', 'stracciatella', 'scamorza',
    'caciocavallo', 'provolone', 'pecorino romano', 'pecorino sardo',
    'pecorino siciliano', 'pecorino toscano', 'parmigiano reggiano',
    'grana padano', 'asiago', 'fontina', 'taleggio', 'gorgonzola',
    'stracchino', 'robiola', 'crescenza', 'stracchino', 'quartirolo',
    
    // Database appellations from appellation table
    'quertaro', 'vinos de la regin vitivincola de quertaro', 'khvanchkara', 'tvishi',
    'okureshi usakhelouri', 'bullas', 'yecla', 'patagonia', 'patagonia argentina',
    'cuyo', 'dagestan', 'mittelrhein', 'rheinhessen', 'pfalz', 'palatinate',
    'beaumes-de-venise', 'cairanne', 'chteauneuf-du-pape', 'clairette de die',
    'condrieu', 'cornas', 'crozes-hermitage', 'cremant de die', 'cte-rtie',
    'ctes du rhne', 'ctes du rhne villages', 'gigondas', 'hermitage', 'lirac',
    'muscat de beaumes-de-venise', 'rasteau', 'saint-joseph', 'tavel', 'vacqueyras',
    'vinsobres', 'distrito medrano', 'reduccin', 'alto valle de ro negro', 'avellaneda',
    'general conesa', 'general roca', 'pichimahuida', 'ro negro', 'rogaland',
    'jaeren coast', 'romneti', 'karlovo', 'hisarya', 'don valley', 'baramati',
    'roti', 'pune', 'ruse', 'barossa valley', 'eden valley', 'southern flinders ranges',
    'mclaren vale',
    
    // Database grape varieties from grapes table
    'aidani', 'airen', 'albana', 'albarola', 'albillo', 'aleksandrouli',
    'alicante bouschet', 'altesse', 'antao vaz', 'aragonez', 'arinto', 'arneis',
    'asprinio', 'athiri', 'baga', 'bellone', 'biancame', 'bianchetta genovese',
    'bianco d\'alessano', 'biancolella', 'blaufrankisch', 'boal', 'bogdanusa',
    'bombino', 'bombino nero', 'bordo', 'bosco', 'bovale', 'canaiolo', 'cannonau',
    'caprettone', 'carinena', 'carmeneres', 'castelao', 'catarratto', 'cayetana blanca',
    'cesanese', 'chasselas', 'chinuri', 'ciliegiolo', 'clairette', 'coda di volpe',
    'colombard', 'corinto nero', 'cornalin', 'corvinone', 'croatina', 'dimyat',
    'drupeggio', 'duras', 'durif', 'fenile', 'fer servadou', 'fortana', 'fumin',
    'furmint', 'gaglioppo', 'gamay del trasimeno', 'gamza', 'garganega', 'goethe',
    'goruli mtsvane', 'graciano', 'grasevina', 'grauburgunder', 'grechetto',
    'grechetto gentile', 'pignoletto', 'greco bianco', 'greco bianco passito',
    'greco nero', 'grk', 'grolleau', 'gruner veltliner', 'harslevelu', 'isabel',
    'italia', 'jacquere', 'kadarka', 'kalecik karasi', 'kekfrankos', 'kotsifali',
    'krakhuna', 'krassato', 'lacrima', 'lambrusco di sorbara', 'lambrusco grasparossa',
    'lambrusco maestri', 'lambrusco salamino', 'lambrusco varieties', 'liatiko',
    'listan blanco', 'listan negro', 'loin de l\'oeil', 'loureiro', 'macabeo',
    'magliocco', 'malmsey', 'malvar', 'malvasia bianca', 'malvasia del lazio',
    'malvasia delle lipari', 'malvasia di candia', 'malvasia volcanica',
    'malvazija istarska', 'mandilari', 'mandilaria', 'mantonico', 'marechal foch',
    'marzemino', 'mataro', 'mauzac', 'mavrud', 'mazuelo', 'melnik', 'melnik 55',
    'melon de bourgogne', 'merseguera', 'mondeuse', 'monica', 'montepulciano rose',
    'montepulciano with sangiovese', 'moscatel', 'moscatel for pisco', 'moscato bianco',
    'moscato giallo', 'mujuretuli', 'muller-thurgau', 'muscadelle', 'muscat blanc',
    'muscat of alexandria', 'muscat ottonel', 'nebbiolo chiavennasca',
    'nebbiolo picotendro', 'negramoll', 'negrette', 'nero buono', 'nero di troia',
    'nielluccio', 'ojaleshi', 'ormeasco', 'ortrugo', 'pais', 'palomino fino',
    'pardina', 'parellada', 'passerina', 'pedro ximenez', 'perricone', 'petit rouge',
    'petit verdot', 'petite arvine', 'piedirosso', 'pigato', 'pinot bianco',
    'pinot meunier', 'pinot nero', 'pinotage', 'plavac mali', 'posip', 'poulsard',
    'premetta', 'prie blanc', 'quebranta', 'raboso', 'ramisco', 'red misket',
    'regent', 'riesling italico', 'riesling sylvaner', 'rkatsiteli', 'robola',
    'roditis', 'rondo', 'roscetto', 'rossese', 'rubin', 'saint laurent',
    'sangiovese prugnolo gentile', 'saperavi', 'sarga muskotaly', 'savagnin',
    'schiava vernatsch', 'sciaccarellu', 'sercial', 'seyval blanc', 'silvaner',
    'solaris', 'spatburgunder', 'st laurent', 'stavroto', 'tai', 'friulano',
    'tempranillo tinta de toro', 'teran', 'teroldego', 'thrapsathiri',
    'tinta roriz', 'tintilia', 'torbato', 'torontel', 'torrontes', 'touriga franca',
    'touriga nacional', 'trebbiano abruzzese', 'trebbiano di soave',
    'trebbiano spoletino', 'trebbiano toscano', 'procanico', 'trincadeira',
    'trousseau', 'tsaoussi', 'tsitska', 'tsolikouri', 'turbiana',
    'trebbiano di lugana', 'usakhelauri', 'uva rara', 'verdeca', 'verdejo',
    'verdelho', 'verdello', 'verdicchio', 'vernaccia di oristano', 'vernaccia nera',
    'vespaiolo', 'vidal', 'vidiano', 'vien de nus', 'vilana', 'vital', 'viura',
    'weissburgunder', 'xarel-lo', 'zibibbo', 'zinfandel', 'zweigelt',
    
    // Database wine regions from countries_regions table (key regions)
    'aargau canton', 'aconcagua region', 'adriatic coast', 'aegean', 'agder county',
    'aguascalientes', 'alentejo', 'algarve', 'algeria', 'alsace', 'algeria',
    'baden-wrttemberg', 'bairrada', 'baja california', 'banat', 'bangalore rural',
    'basilicata', 'beaujolais', 'beira interior', 'bekaa governorate', 'belize',
    'black sea', 'blagoevgrad', 'bolivia', 'bordeaux', 'burgundy', 'calabria',
    'california', 'campania', 'cap bon', 'cape south coast', 'castilla y len',
    'catalua', 'catamarca', 'central', 'central anatolia', 'central macedonia',
    'central paraguay', 'central thailand', 'central ukraine', 'champagne',
    'chubut', 'coahuila', 'colombia', 'corsica', 'costa rica', 'crete',
    'crimean peninsula', 'denmark', 'dobrogea', 'douro valley', 'ecuador',
    'egypt', 'emilia-romagna', 'england', 'epirus', 'extremadura', 'famatina',
    'fraser valley', 'galicia', 'geneva canton', 'graubunden', 'guanajuato',
    'guatemala', 'hokkaido prefecture', 'honduras', 'imereti', 'iran',
    'island of gotland', 'island of krk', 'island of oland', 'islas canarias',
    'istria peninsula', 'jura', 'kakheti', 'kenya', 'krasnodar krai',
    'la rioja', 'languedoc-roussillon', 'lazio', 'liguria', 'loire valley',
    'lombardy', 'madeira islands', 'mendoza', 'michigan', 'minho', 'missouri',
    'molise', 'morocco', 'mosel river valley', 'mount carmel', 'mount lebanon',
    'multiregion', 'muntenia', 'navarra', 'new england', 'new south wales',
    'new york', 'niagara peninsula', 'nicaragua', 'ningxia', 'north adriatic',
    'north aegean', 'north island', 'north of zagreb', 'northern bavaria',
    'northern bulgaria', 'northern cape', 'northern chile', 'northern israel',
    'northern macedonia', 'northern thailand', 'nova scotia', 'okanagan',
    'okanagan valley', 'olifants', 'oregon', 'palestine', 'panama', 'pas vasco',
    'peloponnese', 'piemonte', 'podravje', 'posavje', 'primorska', 'provence',
    'puglia', 'quebec', 'queensland', 'quertaro', 'rhone valley', 'sardinia',
    'savoie', 'saxony-anhalt', 'serra gaucha', 'shandong', 'sicily', 'slavonia',
    'south africa', 'south australia', 'south dalmatia', 'south island',
    'south of hesse', 'southeast sweden', 'southern bulgaria', 'southern chile',
    'southern ukraine', 'southwest', 'southwest sweden', 'southwestern hungary',
    'styria', 'tasmania', 'tejo', 'texas', 'thessaly', 'trentino-alto adige',
    'tuscany', 'umbria', 'valais', 'valle d\'aosta', 'valparaso region',
    'vancouver island', 'veneto', 'victoria', 'vienna', 'vietnam', 'virginia',
    'volga', 'wales', 'washington', 'western australia', 'western cape',
    'western macedonia', 'western ukraine', 'xinjiang', 'yamagata prefecture',
    'yamanashi prefecture', 'yunnan', 'zurich canton', 'moravia', 'bohemia'
  ]
  
  // Check if any wine keywords are present
  return wineKeywords.some(keyword => lowerQuestion.includes(keyword))
}
import OpenAI from 'openai'
import { z } from 'zod'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
})

const AskSchema = z.object({
  question: z.string().min(3).max(1000)
})

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    // Allow unauthenticated requests for wine-related questions (trial mode)
    let isAuthenticated = !authError && !!user
    let userRole = 'guest'
    let trialExpired = false
    
    if (isAuthenticated) {
      // Check trial status for authenticated users
      const { data: profile } = await supabase
        .from('profiles')
        .select('role, trial_expires_at')
        .eq('user_id', user.id)
        .single()
      
      if (profile) {
        userRole = profile.role || 'user'
        trialExpired = profile.trial_expires_at ? new Date(profile.trial_expires_at) < new Date() : false
      }
    }

    // For unauthenticated users, allow wine-related queries only
    if (!isAuthenticated) {
      // Allow wine-related questions for guests
      console.log('Processing request for unauthenticated user (guest mode)')
    } else {
      // For authenticated users, check trial status
      if (trialExpired && userRole !== 'admin' && userRole !== 'moderator') {
        return NextResponse.json({ error: 'Trial expired' }, { status: 402 })
      }
    }

    const body = await request.json()
    const { question } = AskSchema.parse(body)

    // OpenAI moderation
    const moderationResponse = await openai.moderations.create({
      input: question
    })

    if (moderationResponse.results[0].flagged) {
      return NextResponse.json({
        avatarState: 'ERROR',
        answer: 'Domanda furba, ma usciamo dalla cantina. *(We\'re wandering outside the cellar.)*\n\nI can help best with wine, regions, grapes, pairings, and cellar tips. Ask me anything in that world!'
      })
    }

    // Load ML models and entity dictionaries
    const [mlInference, dicts] = await Promise.all([
      getMLInference(),
      loadEntityDictionaries()
    ])

    // Extract question features
    const questionFeatures = extractQuestionFeatures(question, dicts)

    // Predict intent
    const intentScores = await mlInference.predictIntent(questionFeatures)

    // Check for non-wine redirect
    if (await mlInference.shouldRedirectNonWine(intentScores)) {
      return NextResponse.json({
        avatarState: 'ERROR',
        answer: 'Domanda furba, ma usciamo dalla cantina. *(We\'re wandering outside the cellar.)*\n\nI can help best with wine, regions, grapes, pairings, and cellar tips. Ask me anything in that world!'
      })
    }

    // Retrieve relevant chunks
    const retrievedChunks = await searchDocuments(question, 6)
    
    // Extract retrieval features
    const retrievalFeatures = extractRetrievalFeatures(question, retrievedChunks.map(c => c.chunk).join(' '), 'db')

    // Rerank candidates
    const rerankedChunks = await mlInference.rerankCandidates(
      question,
      retrievedChunks,
      questionFeatures,
      retrievalFeatures
    )

    // Try to answer from database first - prioritize database heavily
    const dbResult = await synthesizeFromDB(question)
    const routeFeatures = extractRouteFeatures(questionFeatures, retrievalFeatures, dbResult.canAnswer)

    // Predict route
    const routeScore = await mlInference.predictRoute(questionFeatures, retrievalFeatures, routeFeatures)

    let answer: string
    let source: 'db' | 'openai' = 'db' // Default to database first
    let avatarState: 'ANSWERING' | 'ERROR' = 'ANSWERING'

    // Check if we have a high-quality database answer
    const hasHighQualityAnswer = dbResult.canAnswer && ((!isNaN(routeScore) && routeScore > 0.3) || dbResult.answer.length > 50)
    // Check if question is wine-related
    const isWineRelated = isWineTopic(question)
    
    // Determine if this is a generic fallback based on clear hierarchy:
    // 1. If isWineRelated = false: handled separately below
    // 2. If isWineRelated = true AND hasHighQualityAnswer = true: isGenericFallback = false
    // 3. If isWineRelated = true AND hasHighQualityAnswer = false: use route score logic
    let isGenericFallback = false
    
    if (isWineRelated && !hasHighQualityAnswer) {
      // Only use complex logic when wine-related but NOT high quality
      isGenericFallback = dbResult.canAnswer && (
        // Low route score or NaN
        (isNaN(routeScore) || routeScore <= 0.3) ||
        // Generic list patterns
        dbResult.answer.includes('Here are some appellations I found') ||
        dbResult.answer.includes('Here are some grapes I found') ||
        dbResult.answer.includes('Here are some wines I found') ||
        dbResult.answer.includes('Here are some') ||
        // Educational questions that get generic lists
        (question.toLowerCase().includes('what is') && dbResult.answer.includes('**')) ||
        // Short answers with markdown formatting (generic lists)
        (dbResult.answer.length < 200 && dbResult.answer.includes('**')) ||
        // Answers that start with generic patterns
        dbResult.answer.startsWith('Here are') ||
        // Multiple bullet points (generic lists)
        (dbResult.answer.split('**').length > 4)
      )
    }
    // For isWineRelated=true AND hasHighQualityAnswer=true: isGenericFallback stays false
    // For isWineRelated=false: handled in the if statement below    
    console.log('Routing decision:', { 
      question, 
      isWineRelated, 
      hasHighQualityAnswer, 
      isGenericFallback, 
      routeScore,
      dbAnswer: dbResult.answer.substring(0, 100) + '...',
      canAnswer: dbResult.canAnswer
    })
    
    if (!isWineRelated && dbResult.canAnswer) {
      // Non-wine topic with database answer - show error
      answer = "I am sorry, I cannot answer this question. Can you please ask your question another way and make sure it is about wine. Grazie"
      avatarState = 'ERROR'
      source = 'db'
    } else if (isWineRelated && (question.toLowerCase().includes('pair') || question.toLowerCase().includes('go well') || question.toLowerCase().includes('match') || question.toLowerCase().includes('food'))) {
      // Wine-related food pairing questions should use OpenAI
      try {
        const context = rerankedChunks.slice(0, 3).map(c => c.chunk)
        const userPrompt = buildUserPrompt(question, context)
        
        const completion = await openai.chat.completions.create({
          model: process.env.GIUSEPPE_OPENAI_MODEL || 'gpt-4o-mini',
          messages: [
            { role: 'system', content: GIUSEPPE_SYSTEM_PROMPT },
            { role: 'user', content: userPrompt }
          ],
          max_tokens: parseInt(process.env.GIUSEPPE_MAX_TOKENS || '800'),
          temperature: parseFloat(process.env.GIUSEPPE_TEMPERATURE || '0.7')
        })

        answer = completion.choices[0]?.message?.content || 'I apologize, but I couldn\'t generate a response.'
        source = 'openai'
      } catch (error) {
        console.error('OpenAI error:', error)
        avatarState = 'ERROR'
        answer = 'Mi dispiace, ho avuto un problema tecnico. *(I\'m sorry, I had a technical problem.)*\n\nPlease try asking your question again.'
        source = 'openai'
      }
    } else if ((isGenericFallback && isWineRelated) || (dbResult as any).fallbackToOpenAI) {
      // Wine-related question with generic fallback OR no relevant database/document results - use OpenAI
      try {
        const context = rerankedChunks.slice(0, 3).map(c => c.chunk)
        const userPrompt = buildUserPrompt(question, context)
        
        const completion = await openai.chat.completions.create({
          model: process.env.GIUSEPPE_OPENAI_MODEL || 'gpt-4o-mini',
          messages: [
            { role: 'system', content: GIUSEPPE_SYSTEM_PROMPT },
            { role: 'user', content: userPrompt }
          ],
          max_tokens: parseInt(process.env.GIUSEPPE_MAX_TOKENS || '800'),
          temperature: parseFloat(process.env.GIUSEPPE_TEMPERATURE || '0.7')
        })

        answer = completion.choices[0]?.message?.content || 'I apologize, but I couldn\'t generate a response.'
        source = 'openai'
      } catch (error) {
        console.error('OpenAI error:', error)
        avatarState = 'ERROR'
        answer = 'Mi dispiace, ho avuto un problema tecnico. *(I\'m sorry, I had a technical problem.)*\n\nPlease try asking your question again.'
        source = 'openai'
      }
    } else if (hasHighQualityAnswer && !isGenericFallback) {
      // Use database synthesis
      answer = dbResult.answer
      source = 'db'
    } else if (isWineRelated) {
      // Use OpenAI with RAG
      try {
        const context = rerankedChunks.slice(0, 3).map(c => c.chunk)
        const userPrompt = buildUserPrompt(question, context)
        
        const completion = await openai.chat.completions.create({
          model: process.env.GIUSEPPE_OPENAI_MODEL || 'gpt-4o-mini',
          messages: [
            { role: 'system', content: GIUSEPPE_SYSTEM_PROMPT },
            { role: 'user', content: userPrompt }
          ],
          max_tokens: parseInt(process.env.GIUSEPPE_MAX_TOKENS || '800'),
          temperature: parseFloat(process.env.GIUSEPPE_TEMPERATURE || '0.7')
        })

        answer = completion.choices[0]?.message?.content || 'I apologize, but I couldn\'t generate a response.'
      } catch (error) {
        console.error('OpenAI error:', error)
        avatarState = 'ERROR'
        answer = 'Mi dispiace, ho avuto un problema tecnico. *(I\'m sorry, I had a technical problem.)*\n\nPlease try asking your question again.'
      }
    } else {
      // Non-wine topic - show error
      answer = "I am sorry, I cannot answer this question. Can you please ask your question another way and make sure it is about wine. Grazie"
      avatarState = 'ERROR'
      source = 'db'
    }

    // Add Italian starter
    const starter = getRandomItalianStarter()
    const finalAnswer = `${starter.italian}\n${starter.english}\n\n${answer}`

    // Log the Q&A
    // Only save Q&A record for authenticated users
    let qaRecord = null
    if (isAuthenticated && user) {
      const { data } = await supabase
        .from('questions_answers')
        .insert({
          user_id: user.id,
          question,
          answer: finalAnswer,
          source,
          retrieval_debug: {
            intentScores,
            retrievalFeatures,
            routeScore,
            rerankedChunks: rerankedChunks.slice(0, 3).map(c => ({
              chunk: c.chunk.substring(0, 200) + '...',
              score: c.score,
              originalScore: c.originalScore
            }))
          }
        })
        .select('qa_id')
        .single()
      qaRecord = data
    }

    // Log ML events
    if (qaRecord) {
      await supabase
        .from('ml_events')
        .insert([
          {
            qa_id: qaRecord.qa_id,
            kind: 'intent_infer',
            input_features: questionFeatures,
            output: intentScores
          },
          {
            qa_id: qaRecord.qa_id,
            kind: 'rerank_infer',
            input_features: retrievalFeatures,
            output: rerankedChunks.slice(0, 3)
          },
          {
            qa_id: qaRecord.qa_id,
            kind: 'route_infer',
            input_features: routeFeatures,
            output: { routeScore, chosenRoute: source }
          }
        ])

      // Automatically add new Q&A record to moderation queue (since thumbs_up starts as NULL)
      const { error: moderationError } = await supabase
        .from('moderation_items')
        .insert({
          qa_id: qaRecord.qa_id,
          status: 'pending'
        })

      if (moderationError) {
        console.error('Failed to create moderation item for new Q&A:', moderationError)
      }
    }

    return NextResponse.json({
      avatarState,
      answer: finalAnswer,
      qaId: qaRecord?.qa_id
    })

  } catch (error) {
    console.error('Ask API error:', error)
    
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid question format' }, { status: 400 })
    }
    
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
