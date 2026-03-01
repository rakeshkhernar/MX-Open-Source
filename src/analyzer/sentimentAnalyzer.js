/**
 * Sentiment Analyzer Module
 * Analyzes text for emotional intent and manipulation patterns
 * Supports prominence-weighted segment analysis
 * 
 * Categories:
 * - positive: Text trying to make reader like/love something
 * - negative: Text trying to make reader hate/fear something
 * - neutral: Factual, unbiased reporting
 * 
 * Also detects manipulation intensity (how hard text is trying to influence)
 */

// Emotional intensity words - positive sentiment
const POSITIVE_WORDS = {
  strong: [
    // Core positive emotions
    'love', 'adore', 'cherish', 'treasure', 'worship',
    // Excellence descriptors
    'amazing', 'wonderful', 'fantastic', 'incredible', 'beautiful',
    'brilliant', 'excellent', 'outstanding', 'magnificent', 'perfect',
    'stunning', 'spectacular', 'remarkable', 'phenomenal', 'superb',
    'divine', 'glorious', 'fabulous', 'marvelous', 'exquisite',
    'extraordinary', 'exceptional', 'sublime', 'transcendent', 'flawless',
    'impeccable', 'immaculate', 'supreme', 'unparalleled', 'unrivaled',
    'unmatched', 'unsurpassed', 'incomparable', 'matchless', 'peerless',
    // Achievement/success
    'triumph', 'triumphant', 'victorious', 'victory', 'champion',
    'hero', 'heroic', 'heroism', 'legendary', 'iconic', 'historic',
    // Spiritual/emotional highs
    'blessed', 'miraculous', 'miracle', 'magical', 'enchanting',
    'blissful', 'bliss', 'euphoric', 'euphoria', 'ecstatic', 'ecstasy',
    'rapture', 'rapturous', 'elated', 'elation', 'jubilant', 'jubilation',
    // Embrace/celebration
    'embrace', 'celebrate', 'celebration', 'rejoice', 'acclaim',
    'applaud', 'ovation', 'standing ovation', 'bravo',
    // Transformative positivity
    'revolutionary', 'groundbreaking', 'breakthrough', 'pioneering',
    'trailblazing', 'visionary', 'transformative', 'game-changing',
    // Heartwarming
    'heartwarming', 'touching', 'moving', 'poignant', 'tender',
    'wholesome', 'uplifting', 'inspirational', 'awe-inspiring', 'breathtaking',
    // Grandeur/mastery
    'exemplary', 'monumental', 'illustrious', 'majestic', 'resplendent',
    'masterful', 'prodigious', 'stupendous', 'definitive', 'preeminent',
    'consummate', 'virtuoso', 'magnum opus', 'tour de force',
    // Captivation
    'captivating', 'enthralling', 'spellbinding', 'mesmerizing', 'riveting',
    // Deep satisfaction
    'fulfilling', 'gratifying', 'rewarding', 'enriching', 'empowering',
    'liberating', 'invigorating', 'exhilarating', 'thrilling', 'electrifying',
    // Peak quality
    'world-class', 'best-in-class', 'state-of-the-art', 'cutting-edge',
    'top-notch', 'first-rate', 'top-tier', 'premium', 'elite',
    // Deep bond/love
    'beloved', 'soulmate', 'kindred spirit', 'devotion', 'devoted',
    'unconditional', 'unwavering', 'steadfast', 'lifelong',
    // Awe/wonder
    'awe-struck', 'astounding', 'mind-blowing', 'jaw-dropping',
    'dazzling', 'radiant', 'luminous', 'effervescent', 'vibrant'
  ],
  moderate: [
    'great', 'nice', 'happy', 'pleased', 'glad', 'delighted', 'positive', 'beneficial',
    'helpful', 'supportive', 'kind', 'caring', 'warm', 'friendly', 'welcome', 'welcoming',
    'inviting', 'open', 'appreciate', 'appreciated', 'appreciation', 'grateful', 'thankful', 'gratitude',
    'thanks', 'thank you', 'indebted', 'obliged', 'success', 'successful', 'succeed', 'succeeding',
    'achievement', 'accomplish', 'accomplished', 'accomplishment', 'attain', 'attained', 'proud', 'pride',
    'hopeful', 'hope', 'optimistic', 'optimism', 'promising', 'bright', 'thriving', 'flourishing',
    'prosperous', 'enjoy', 'enjoyed', 'enjoying', 'enjoyable', 'enjoyment', 'exciting', 'excited',
    'excitement', 'favorite', 'favourite', 'cherished', 'treasured', 'inspire', 'inspired', 'inspiring',
    'inspiration', 'motivate', 'motivated', 'motivating', 'motivation', 'encourage', 'encouraged', 'creative',
    'creativity', 'innovative', 'innovation', 'inventive', 'imaginative', 'original', 'clever', 'ingenious',
    'resourceful', 'delicious', 'tasty', 'yummy', 'scrumptious', 'mouthwatering', 'savory', 'delectable',
    'appetizing', 'flavorful', 'aromatic', 'fresh', 'healthy', 'glowing', 'elegant', 'graceful',
    'charming', 'lovely', 'pretty', 'gorgeous', 'cozy', 'relaxing', 'soothing', 'calming',
    'peaceful', 'serene', 'refreshing', 'revitalizing', 'rejuvenating', 'enlightening', 'valuable', 'worthwhile',
    'meaningful', 'significant', 'important', 'essential', 'vital', 'crucial', 'indispensable', 'invaluable',
    'fun', 'straightforward', 'intuitive', 'seamless', 'complimentary', 'bonus', 'extra', 'added',
    'best', 'premier', 'leading', 'recommended', 'endorsed', 'donate', 'donation', 'donations',
    'giving', 'give back', 'generosity', 'generous', 'benevolent', 'altruistic', 'selfless', 'compassion',
    'compassionate', 'empathy', 'empathetic', 'sympathetic', 'humanitarian', 'philanthropic', 'charitable', 'benign',
    'volunteer', 'volunteers', 'volunteering', 'service', 'serving', 'trusted', 'trustworthy', 'reliable',
    'dependable', 'consistent', 'authentic', 'genuine', 'sincere', 'honest', 'transparent', 'improve',
    'improved', 'improving', 'improvement', 'better', 'progress', 'progressing', 'progressive', 'advance',
    'advancing', 'upgrade', 'upgraded', 'enhanced', 'enhancement', 'optimized', 'harmony', 'harmonious',
    'balanced', 'unified', 'united', 'inclusive', 'diverse', 'diversity', 'equality', 'safe',
    'secure', 'protected', 'constructive', 'equitable', 'insightful', 'thoughtful', 'commendable', 'praiseworthy',
    'noteworthy', 'heartening', 'meritorious', 'admirable', 'credible', 'dignified', 'distinguished', 'esteemed',
    'respected', 'reputable', 'honorable', 'principled', 'virtuous', 'diligent', 'dedicated', 'passionate',
    'enthusiastic', 'compelling', 'delightful', 'nurturing', 'eloquent', 'articulate', 'perceptive', 'astute',
    'discerning', 'sophisticated', 'refined', 'polished', 'cultured', 'worldly', 'versatile', 'adept',
    'proficient', 'skilled', 'deft', 'nimble', 'collaborative', 'cooperative', 'collegial', 'convivial',
    'amicable', 'cordial', 'affable', 'genial', 'amiable', 'diplomatic', 'tactful', 'attentive',
    'responsive', 'earnest', 'forthright', 'accountable', 'conscientious', 'scrupulous', 'upstanding', 'noble',
    'gallant', 'chivalrous', 'magnanimous', 'seasoned', 'proven', 'established', 'reputed', 'recognized',
    'awarded', 'decorated', 'honored', 'tenured'
  ],
  mild: [
    'okay', 'ok', 'fine', 'acceptable', 'reasonable', 'fair', 'decent', 'satisfactory',
    'adequate', 'sufficient', 'passable', 'tolerable', 'pleasant', 'agreeable', 'comfortable', 'content',
    'satisfied', 'useful', 'usable', 'practical', 'pragmatic', 'functional', 'convenient', 'handy',
    'accessible', 'available', 'attainable', 'efficient', 'effective', 'productive', 'competent', 'capable',
    'stable', 'steady', 'solid', 'sound', 'workable', 'feasible', 'viable', 'sustainable',
    'maintainable', 'manageable', 'good', 'easy', 'simple', 'free', 'top', 'safety',
    'security', 'protection', 'updated', 'measured', 'orderly', 'organized', 'systematic', 'methodical',
    'proper', 'appropriate', 'suitable', 'fitting', 'apt', 'relevant', 'serviceable', 'neat',
    'tidy', 'clean', 'crisp', 'smooth', 'affordable', 'economical', 'cost-effective', 'competitive',
    'durable', 'sturdy', 'robust', 'resilient', 'long-lasting', 'appealing'
  ]
};

// Emotional intensity words - negative sentiment
const NEGATIVE_WORDS = {
  strong: [
    'hate', 'hatred', 'despise', 'loathe', 'loathing', 'abhor', 'detest', 'revile',
    'scorn', 'contempt', 'contemptuous', 'disdain', 'terrible', 'horrible', 'horrendous', 'horrific',
    'horrifying', 'disgusting', 'revolting', 'repulsive', 'repugnant', 'nauseating', 'vile', 'vicious',
    'malicious', 'malevolent', 'sinister', 'evil', 'wicked', 'depraved', 'degenerate', 'perverse',
    'corrupt', 'corrupted', 'rotten', 'putrid', 'toxic', 'poisonous', 'destroy', 'destroyed',
    'destroying', 'destruction', 'destructive', 'devastate', 'devastated', 'devastating', 'devastation', 'annihilate',
    'annihilated', 'obliterate', 'obliterated', 'decimate', 'decimated', 'ravage', 'ravaged', 'ruin',
    'ruined', 'catastrophic', 'catastrophe', 'cataclysmic', 'apocalyptic', 'disastrous', 'disaster', 'calamity',
    'calamitous', 'outrageous', 'outrage', 'atrocious', 'atrocity', 'abomination', 'abominable', 'heinous',
    'monstrous', 'monstrosity', 'grotesque', 'despicable', 'deplorable', 'reprehensible', 'inexcusable', 'unforgivable',
    'pathetic', 'pitiful', 'woeful', 'wretched', 'miserable', 'awful', 'dreadful', 'ghastly',
    'nightmare', 'nightmarish', 'tragedy', 'tragic', 'worst', 'abysmal', 'dismal', 'brutal',
    'brutality', 'savage', 'savagery', 'barbaric', 'barbarous', 'cruel', 'cruelty', 'ruthless',
    'merciless', 'heartless', 'callous', 'murder', 'murderous', 'killer', 'deadly', 'lethal',
    'fatal', 'betray', 'betrayal', 'betrayed', 'treachery', 'treacherous', 'deceit', 'deceitful',
    'dishonest', 'fraudulent', 'tyranny', 'tyrannical', 'oppression', 'oppressive', 'dictatorial', 'totalitarian',
    'authoritarian', 'fascist', 'fascism', 'insidious', 'nefarious', 'diabolical', 'inhumane', 'psychopathic',
    'sociopathic', 'deranged', 'demented', 'sadistic', 'twisted', 'bloodthirsty', 'genocidal', 'venomous',
    'pernicious', 'egregious', 'unconscionable', 'treasonous', 'fanatical', 'zealous', 'zealotry', 'extremist',
    'extremism', 'radical', 'radicalism', 'militant', 'militancy', 'unethical', 'immoral', 'amoral',
    'debauched', 'licentious', 'abhorrent', 'reprobate', 'ignominious', 'infamous', 'irredeemable', 'irreparable',
    'irrecoverable', 'unsalvageable', 'hopeless', 'doomed', 'condemned', 'forsaken', 'accursed', 'pestilent',
    'cancerous', 'festering', 'gangrenous', 'necrotic', 'putrefying', 'rotting', 'decomposing', 'squalid',
    'fetid', 'agonizing', 'excruciating', 'gut-wrenching', 'soul-crushing', 'harrowing', 'blood-curdling', 'bone-chilling',
    'skin-crawling', 'perfidious', 'unprincipled', 'unscrupulous', 'malfeasant', 'malfeasance', 'venal', 'sordid'
  ],
  moderate: [
    'bad', 'wrong', 'poor', 'inferior', 'subpar', 'lacking', 'deficient', 'angry',
    'anger', 'upset', 'frustrated', 'frustrating', 'frustration', 'annoyed', 'annoying', 'irritated',
    'irritating', 'aggravated', 'disappointed', 'disappointing', 'disappointment', 'dissatisfied', 'displeased', 'unhappy',
    'discontent', 'discontented', 'worried', 'worrying', 'worry', 'concerned', 'concern', 'afraid',
    'scared', 'fearful', 'frightened', 'frightening', 'alarming', 'anxious', 'anxiety', 'nervous',
    'uneasy', 'apprehensive', 'dread', 'panic', 'panicked', 'terrified', 'terrifying', 'petrified',
    'harmful', 'hurtful', 'damaging', 'damage', 'injured', 'injury', 'problematic', 'troubling',
    'troublesome', 'disturbing', 'disturbed', 'unsettling', 'unnerving', 'distressing', 'distressed', 'traumatic',
    'fail', 'failed', 'failing', 'failure', 'unsuccessful', 'defeat', 'rejected', 'rejection',
    'refused', 'denial', 'denied', 'criticized', 'criticism', 'condemnation', 'denounced', 'blamed',
    'blame', 'accused', 'accusation', 'allegations', 'sad', 'sadness', 'sorrow', 'sorrowful',
    'grief', 'grieving', 'mourn', 'mourning', 'lament', 'heartbreak', 'heartbroken', 'depressed',
    'depressing', 'depression', 'melancholy', 'gloomy', 'misery', 'suffering', 'anguish', 'agony',
    'torment', 'furious', 'fuming', 'livid', 'irate', 'enraged', 'infuriated', 'outraged',
    'indignant', 'incensed', 'seething', 'wrathful', 'hostile', 'hostility', 'aggressive', 'aggression',
    'violent', 'combative', 'confrontational', 'antagonistic', 'adversarial', 'clash', 'clashed', 'controversy',
    'contentious', 'decline', 'declining', 'deteriorate', 'deteriorating', 'worsen', 'worsening', 'collapse',
    'collapsing', 'crumbling', 'falling apart', 'scandal', 'scandalous', 'disgrace', 'disgraceful', 'shameful',
    'embarrassing', 'embarrassment', 'humiliating', 'humiliation', 'dangerous', 'danger', 'hazard', 'hazardous',
    'perilous', 'precarious', 'vulnerable', 'threatened', 'exploitative', 'polarizing', 'weaponized', 'radicalized',
    'beleaguered', 'plagued', 'embattled', 'besieged', 'tarnished', 'reeling', 'spiraling', 'stagnant',
    'eroded', 'undermined', 'negligent', 'reckless', 'irresponsible', 'dysfunctional', 'chaotic', 'turbulent',
    'volatile', 'inflammatory', 'provocative', 'menacing', 'ominous', 'decadent', 'decadence', 'demoralized',
    'disenfranchised', 'marginalized', 'ostracized', 'alienated', 'disillusioned', 'cynical', 'pessimistic', 'fatalistic',
    'nihilistic', 'apathetic', 'complacent', 'complicit', 'culpable', 'manipulative', 'manipulated', 'gaslighting',
    'gaslighted', 'coerced', 'coercive', 'coercion', 'exploited', 'exploitation', 'duped', 'defrauded',
    'swindled', 'bamboozled', 'hoodwinked', 'misleading', 'mislead', 'deceptive', 'disingenuous', 'duplicitous',
    'silenced', 'censored', 'suppressed', 'stifled', 'muzzled', 'blacklisted', 'blackballed', 'excluded',
    'barred', 'banned', 'corroded', 'compromised', 'tainted', 'contaminated', 'adulterated', 'perverted',
    'distorted', 'warped', 'unsafe', 'insecure', 'unprotected', 'exposed', 'susceptible', 'unregulated',
    'unmonitored', 'unsupervised', 'unaccountable', 'incompetent', 'ineffective', 'inefficient', 'inadequate', 'inept',
    'bungled', 'botched', 'mismanaged', 'mishandled', 'abusive', 'predatory', 'parasitic', 'narcissistic',
    'vindictive', 'retaliatory', 'spiteful', 'malignant'
  ],
  mild: [
    // Neutral-negative
    'meh', 'underwhelming', 'lackluster', 'bland', 'dull', 'boring',
    'mediocre', 'average', 'ordinary', 'unremarkable', 'forgettable',
    // Slight negativity
    'weak', 'weaker', 'weakened', 'flawed', 'imperfect', 'faulty',
    'unfortunate', 'regrettable', 'unpleasant', 'uncomfortable',
    'inconvenient', 'awkward', 'clumsy', 'messy', 'sloppy',
    // Difficulty/challenge
    'difficult', 'hard', 'tough', 'challenging', 'demanding', 'taxing',
    'complicated', 'complex', 'confusing', 'unclear', 'ambiguous',
    // Uncertainty/doubt
    'worrisome', 'questionable', 'doubtful', 'dubious',
    'uncertain', 'vague', 'ambivalent', 'hesitant',
    'skeptical', 'suspicious', 'wary', 'cautious',
    // Disappointment
    'letdown', 'anticlimactic',
    // Obsolescence
    'outdated', 'obsolete', 'dated', 'old-fashioned', 'stale',
    // Generic negative (common in neutral contexts)
    'risk', 'risky', 'conflict', 'dispute', 'concerning',
    // Insipid/lifeless
    'tepid', 'lukewarm', 'half-hearted', 'listless', 'insipid',
    'flat', 'monotonous', 'tedious', 'tiresome', 'pedestrian',
    'uninspired', 'unimaginative', 'derivative', 'predictable',
    'overrated', 'muddled',
    // Mild interpersonal
    'rude', 'impolite', 'discourteous', 'inconsiderate', 'thoughtless',
    'dismissive', 'condescending', 'patronizing', 'aloof', 'detached',
    // Work/performance
    'unproductive', 'ineffectual', 'fruitless', 'futile', 'pointless',
    'aimless', 'directionless', 'unfocused', 'scattered', 'haphazard',
    // Quality issues
    'substandard', 'shoddy', 'cheap', 'flimsy', 'rickety',
    'unreliable', 'inconsistent', 'erratic', 'spotty', 'patchy'
  ]
};

// Word intensity multipliers (applied in addition to prominence weight)
const INTENSITY_MULTIPLIERS = {
  strong: 3,
  moderate: 2,
  mild: 1
};

// Tone signal categories — classify detected sentiment words by *type* of emotion
// These complement manipulation patterns: manipulation = specific persuasion techniques,
// tone signals = what flavor of emotional language is present.
// Negative tone signals
const NEGATIVE_TONE_SIGNALS = {
  hostility: [
    // Aggression/conflict/violence
    'hate', 'hatred', 'despise', 'loathe', 'loathing', 'abhor', 'detest',
    'hostile', 'hostility', 'aggressive', 'aggression', 'violent', 'violence',
    'combative', 'confrontational', 'antagonistic', 'belligerent', 'bellicose',
    'conflict', 'dispute', 'contentious', 'acrimonious', 'vitriolic', 'venomous',
    'brutal', 'brutality', 'savage', 'savagery', 'barbaric', 'barbarous',
    'cruel', 'cruelty', 'ruthless', 'merciless', 'heartless', 'callous',
    'murder', 'murderous', 'killer', 'deadly', 'lethal', 'fatal',
    'furious', 'fuming', 'livid', 'irate', 'enraged', 'infuriated',
    'outraged', 'incensed', 'seething', 'wrathful', 'apoplectic',
    'angry', 'anger', 'destroy', 'destroyed', 'destruction', 'destructive',
    'annihilate', 'obliterate', 'decimate', 'ravage', 'demolish', 'eviscerate',
    'attack', 'attacked', 'war', 'warfare', 'fight', 'fighting',
    'abuse', 'abusive', 'abused', 'assault', 'assaulted', 'batter', 'battered',
    'condemn', 'condemned', 'condemning', 'denounce', 'denounced',
    'vindictive', 'spiteful', 'malice', 'malign', 'maligned',
    'intimidate', 'intimidation', 'bully', 'bullying', 'harass', 'harassment',
    'persecute', 'persecution', 'oppress', 'suppression',
    'retaliate', 'retaliation', 'retribution', 'vengeance', 'revenge'
  ],
  alarm: [
    // Crisis/danger/threat/urgency
    'crisis', 'emergency', 'catastrophe', 'catastrophic', 'disaster', 'disastrous',
    'calamity', 'cataclysmic', 'apocalyptic', 'doomsday', 'armageddon',
    'danger', 'dangerous', 'threat', 'threatened', 'threatening', 'menacing',
    'alarming', 'alarm', 'warning', 'warned', 'alert', 'red flag',
    'risk', 'risky', 'hazard', 'hazardous', 'perilous', 'precarious',
    'vulnerable', 'exposed', 'susceptible', 'defenseless',
    'terrifying', 'terrified', 'frightening', 'frightened', 'harrowing',
    'panic', 'panicked', 'dread', 'foreboding', 'ominous',
    'collapse', 'collapsing', 'crumbling', 'deteriorate', 'deteriorating',
    'decline', 'declining', 'worsen', 'worsening', 'plummet', 'plummeting',
    'devastate', 'devastated', 'devastating', 'devastation',
    'terror', 'terrorist', 'terrorism',
    'extreme', 'extremist', 'extremism', 'radical', 'radicalized',
    'violate', 'violated', 'violation',
    'ban', 'banned', 'crackdown', 'lockdown', 'shutdown',
    'epidemic', 'pandemic', 'outbreak', 'contagion', 'plague',
    'escalate', 'escalating', 'escalation', 'surge', 'surging',
    'imminent', 'impending', 'looming', 'brewing',
    'unstable', 'instability', 'volatile', 'volatility', 'turmoil', 'upheaval'
  ],
  distress: [
    // Suffering/loss/sadness/grief
    'suffering', 'suffer', 'suffered', 'anguish', 'agony', 'torment', 'ordeal',
    'pain', 'painful', 'hurt', 'hurtful', 'injured', 'injury', 'wound', 'wounded',
    'tragedy', 'tragic', 'grief', 'grieving', 'mourn', 'mourning', 'bereavement',
    'heartbreak', 'heartbroken', 'sorrow', 'sorrowful', 'woeful',
    'sad', 'sadness', 'depressed', 'depressing', 'depression',
    'melancholy', 'gloomy', 'misery', 'miserable', 'despondent', 'forlorn',
    'victim', 'victims', 'death', 'died', 'dying', 'dead', 'killed',
    'loss', 'lost', 'lament', 'bereft', 'deprived',
    'distressing', 'distressed', 'traumatic', 'trauma', 'traumatized',
    'desperate', 'despair', 'hopeless', 'helpless', 'powerless', 'impotent',
    'anxious', 'anxiety', 'worried', 'worry', 'dread', 'apprehension',
    'afraid', 'scared', 'fearful', 'nervous', 'uneasy', 'petrified',
    'horrible', 'horrific', 'horrifying', 'terrible', 'terribly',
    'lonely', 'loneliness', 'isolated', 'isolation', 'abandoned', 'forsaken',
    'shattered', 'crushed', 'broken', 'devastated', 'inconsolable',
    'overwhelmed', 'exhausted', 'drained', 'burned out', 'burnout',
    'struggling', 'hardship', 'adversity', 'plight', 'predicament'
  ],
  contempt: [
    // Disapproval/disgust/moral judgment
    'disgust', 'disgusting', 'revolting', 'repulsive', 'repugnant', 'nauseating',
    'vile', 'vicious', 'malicious', 'malevolent', 'sinister', 'nefarious',
    'evil', 'wicked', 'depraved', 'degenerate', 'perverse', 'debased',
    'corrupt', 'corrupted', 'rotten', 'toxic', 'poisonous', 'cancerous',
    'outrageous', 'atrocious', 'atrocity', 'abomination', 'abominable',
    'heinous', 'monstrous', 'grotesque', 'egregious',
    'despicable', 'deplorable', 'reprehensible', 'inexcusable', 'unforgivable',
    'pathetic', 'pitiful', 'woeful', 'wretched', 'contemptible',
    'scandal', 'scandalous', 'disgrace', 'disgraceful', 'shameful',
    'embarrassing', 'embarrassment', 'humiliating', 'humiliation',
    'fail', 'failed', 'failure', 'incompetent', 'negligent', 'inept',
    'betray', 'betrayal', 'betrayed', 'treachery', 'treacherous',
    'deceit', 'deceitful', 'dishonest', 'fraudulent', 'fraud', 'sham',
    'scorn', 'contempt', 'contemptuous', 'disdain', 'sneer', 'mock',
    'tyranny', 'tyrannical', 'oppression', 'oppressive', 'authoritarian',
    'idiot', 'idiotic', 'stupid', 'foolish', 'moronic', 'imbecile',
    'ridiculous', 'absurd', 'laughable', 'preposterous', 'ludicrous',
    'biased', 'propaganda', 'indoctrination', 'brainwashing',
    'liar', 'lie', 'lies', 'lying', 'lied', 'fabricate', 'fabrication',
    'hypocrisy', 'hypocrite', 'hypocritical', 'double standard',
    'blame', 'blamed', 'coward', 'cowardly', 'spineless', 'gutless',
    'complicit', 'culpable', 'sycophant', 'crony', 'puppet',
    'charlatan', 'quack', 'snake oil', 'grifter', 'con artist'
  ]
};

// Positive tone signals
const POSITIVE_TONE_SIGNALS = {
  admiration: [
    // Excellence/respect/praise/awe
    'amazing', 'wonderful', 'fantastic', 'incredible', 'brilliant',
    'excellent', 'outstanding', 'magnificent', 'phenomenal', 'superb',
    'remarkable', 'extraordinary', 'exceptional', 'sublime', 'flawless',
    'impeccable', 'stunning', 'spectacular', 'breathtaking', 'awe-inspiring',
    'legendary', 'iconic', 'heroic', 'hero', 'heroism', 'valiant', 'courageous',
    'triumph', 'triumphant', 'victorious', 'champion', 'conquer', 'prevail',
    'revolutionary', 'groundbreaking', 'breakthrough', 'pioneering', 'innovative',
    'visionary', 'transformative', 'game-changing', 'trailblazing', 'cutting-edge',
    'genius', 'masterly', 'masterful', 'masterpiece', 'prodigy', 'virtuoso',
    'inspire', 'inspired', 'inspiring', 'inspirational', 'uplifting',
    'impressive', 'admire', 'admired', 'admiration', 'admirable',
    'respect', 'respected', 'respectable', 'prestigious', 'esteemed',
    'distinguished', 'illustrious', 'acclaimed', 'celebrated', 'revered',
    'exemplary', 'commendable', 'praiseworthy', 'laudable', 'meritorious',
    'first-rate', 'world-class', 'top-notch', 'unrivaled', 'unparalleled'
  ],
  warmth: [
    // Compassion/care/kindness/gratitude/connection
    'love', 'adore', 'cherish', 'treasure', 'beloved',
    'kind', 'kindness', 'caring', 'care', 'compassion', 'compassionate',
    'empathy', 'empathetic', 'sympathetic', 'sympathy', 'understanding',
    'generous', 'generosity', 'benevolent', 'altruistic', 'selfless',
    'grateful', 'thankful', 'gratitude', 'appreciate', 'appreciated',
    'heartwarming', 'touching', 'moving', 'poignant', 'tender', 'endearing',
    'wholesome', 'gentle', 'nurturing', 'supportive', 'encouraging',
    'friendly', 'warm', 'welcoming', 'inviting', 'hospitable', 'inclusive',
    'thoughtful', 'considerate', 'gracious', 'courteous', 'respectful',
    'charitable', 'humanitarian', 'philanthropic', 'benign',
    'volunteer', 'volunteering', 'donate', 'donation', 'giving',
    'comfort', 'comforting', 'soothing', 'cozy', 'reassuring',
    'trust', 'trusted', 'trustworthy', 'faithful', 'loyal', 'devoted',
    'solidarity', 'camaraderie', 'fellowship', 'kinship', 'togetherness',
    'mentor', 'mentoring', 'guide', 'guiding', 'counsel',
    'forgive', 'forgiveness', 'reconcile', 'reconciliation', 'harmony'
  ],
  optimism: [
    // Hope/progress/improvement/opportunity
    'hope', 'hopeful', 'hoping', 'optimistic', 'optimism',
    'promising', 'bright', 'brighter', 'encouraging', 'auspicious',
    'improve', 'improved', 'improving', 'improvement', 'upgrade',
    'progress', 'progressing', 'progressive', 'advance', 'advancing',
    'grow', 'growing', 'growth', 'thrive', 'thriving', 'flourish', 'flourishing',
    'prosper', 'prosperous', 'prosperity', 'abundant', 'abundance',
    'opportunity', 'opportunities', 'potential', 'possibilities',
    'motivate', 'motivated', 'motivating', 'motivation', 'driven',
    'empower', 'empowered', 'empowering', 'empowerment', 'liberate',
    'achieve', 'achieved', 'achievement', 'accomplish', 'accomplished',
    'success', 'successful', 'succeed', 'succeeding', 'milestone',
    'resolve', 'resolved', 'solution', 'solutions', 'answered',
    'recover', 'recovered', 'recovery', 'heal', 'healing', 'rehabilitate',
    'renew', 'renewed', 'renewal', 'revitalize', 'rejuvenate', 'reinvigorate',
    'uplift', 'uplifting', 'elevate', 'elevating', 'transcend',
    'resilient', 'resilience', 'persevere', 'perseverance', 'endure',
    'overcome', 'overcoming', 'surmount', 'conquer', 'prevail',
    'innovate', 'innovation', 'create', 'creative', 'creativity',
    'sustainable', 'sustainability', 'green', 'clean', 'renewable'
  ],
  celebration: [
    // Joy/happiness/delight/festivity
    'happy', 'happiness', 'joy', 'joyful', 'joyous', 'gleeful',
    'celebrate', 'celebration', 'celebrating', 'festive', 'festival', 'gala',
    'delight', 'delighted', 'delightful', 'elated', 'elation',
    'ecstatic', 'ecstasy', 'euphoric', 'euphoria', 'exultant',
    'jubilant', 'jubilation', 'rejoice', 'rejoicing', 'revelry',
    'bliss', 'blissful', 'rapture', 'rapturous', 'nirvana',
    'excited', 'exciting', 'excitement', 'thrilling', 'exhilarating',
    'fun', 'funny', 'hilarious', 'amusing', 'entertaining', 'comical',
    'laugh', 'laughing', 'laughter', 'humor', 'humorous', 'witty',
    'enjoy', 'enjoyed', 'enjoying', 'enjoyable', 'enjoyment', 'relish',
    'pleased', 'pleasure', 'pleasant', 'satisfying', 'satisfied', 'gratifying',
    'awesome', 'terrific', 'marvelous', 'splendid', 'glorious',
    'beautiful', 'gorgeous', 'lovely', 'radiant', 'dazzling',
    'applaud', 'ovation', 'bravo', 'acclaim', 'cheer', 'cheering',
    'congratulate', 'congratulations', 'hooray', 'hurrah',
    'festivity', 'carnival', 'parade', 'triumph', 'toast', 'honor'
  ]
};

// Manipulation/persuasion indicators
// NOTE: These should be phrases/words that indicate INTENT TO MANIPULATE,
// not just emotionally charged words that appear in legitimate news.
// "Crisis" in a news headline about a real crisis is not manipulation.
// "CRISIS! Act NOW before it's too late!" is manipulation.
const MANIPULATION_PATTERNS = {
  // Fear-mongering: Direct appeals to reader's fear, not just reporting on scary events
  // These phrases attempt to create anxiety and urgency in the reader
  fear: [
    'you must act', 'you must prepare', 'you must protect', 'you need to know', 'you need to act', 'you need to prepare', 'you have to act', 'you have to see this',
    'you should be afraid', 'you should be worried', 'you should be concerned', 'while you still can', 'don\'t wait', 'don\'t let them', 'don\'t let this', 'don\'t be fooled',
    'protect yourself', 'protect your family', 'protect your children', 'be warned', 'be very afraid', 'be prepared', 'wake up', 'open your eyes',
    'see the truth', 'face the facts', 'they want you to', 'they don\'t want you to know', 'they\'re hiding', 'they\'re lying', 'they\'re coming for', 'they\'re trying to',
    'what they\'re not telling you', 'what they don\'t want you to see', 'what the government doesn\'t want you to know', 'what the media won\'t tell you', 'what doctors won\'t tell you', 'the real truth', 'truth revealed', 'the untold story',
    'the hidden story', 'the real reason why', 'the real agenda', 'finally exposed', 'exposed the truth', 'terrifying truth', 'shocking truth', 'disturbing truth',
    'ugly truth', 'hidden agenda', 'secret agenda', 'hidden truth', 'hidden danger', 'coming for you', 'coming for your', 'threat to your',
    'your family', 'your children', 'your loved ones', 'your home', 'your freedom', 'your rights', 'your future', 'your safety',
    'our children', 'our families', 'our freedom', 'our country', 'end of the world', 'end times', 'collapse is coming', 'economic collapse',
    'society is collapsing', 'civilization will', 'point of no return', 'it\'s already happening', 'happening right now', 'happening in your', 'doctors are shocked', 'doctors don\'t want',
    'big pharma', 'they\'re putting', 'in our food', 'in our water', 'in the vaccines', 'microchipped', 'tracking you', 'surveillance state',
    '5g causes', 'chemtrails', 'fluoride is', 'gmo dangers', 'window is closing', 'may be too late', 'almost too late', 'verge of disaster',
    'false flag', 'false flags', 'crisis actor', 'crisis actors', 'controlled opposition', 'limited hangout', 'psyop', 'psy-op',
    'psychological operation', 'official narrative', 'mainstream narrative', 'do your own research', 'do your research', 'follow the money', 'connect the dots', 'connecting the dots',
    'red pill', 'red-pilled', 'take the red pill', 'down the rabbit hole', 'rabbit hole', 'nothing to see here', 'trust the plan', 'population control',
    'depopulation agenda', 'the great reset', 'great awakening', 'mark of the beast', 'social credit system', 'bioweapon', 'bioweapons', 'weather warfare',
    'weather manipulation', 'you are being lied to', 'you are being deceived', 'hiding in plain sight', 'in plain sight', 'controlled narrative', 'narrative control', 'narrative warfare',
    'information warfare', 'information war', 'thought control', 'mind control', 'mass formation', 'predictive programming', 'social engineering', 'manufactured consent',
    'manufactured crisis', 'astroturfing', 'astroturf', 'controlled demolition', 'orwellian', 'big brother', 'thought crime', 'wrongthink',
    'memory hole', 'ministry of truth', 'doublethink', 'newspeak', 'brave new world', 'total control', 'total surveillance', 'so-called science',
    'so-called experts', 'so-called doctors', 'rubber stamp', 'rubber-stamped', 'blindly trust', 'blindly follow', 'blind obedience', 'question everything',
    'trust no one', 'ticking time bomb', 'running out of time', 'dark days ahead', 'stormy clouds', 'gathering storm', 'writing on the wall', 'handwriting on the wall',
    'gain of function', 'lab leak', 'virus was engineered', 'agenda 2030', 'build back better plot', 'you will own nothing', 'digital prison', 'digital gulag',
    'technocracy', 'technocratic', 'central bank digital currency', 'cbdc tyranny', 'cloud seeding conspiracy', 'chem trails', 'geoengineering conspiracy', 'fluoride conspiracy',
    'fluoride poison', 'weaponized against the people', 'weaponized government', 'two-tier system', 'selective enforcement', 'rules for thee', 'rules for thee but not for me', 'banana republic',
    'show trial', 'kangaroo court', 'political witch hunt', 'witch hunt', 'symptoms you\'re ignoring', 'warning signs your body', 'silent killer', 'ticking time bomb in your body',
    'your doctor is lying', 'what your doctor won\'t tell', 'medical establishment cover-up', 'suppressed cure', 'miracle cure they', 'miracle treatment they', 'banned in other countries', 'toxins in your',
    'everyday chemicals', 'hidden ingredients', 'your data is being', 'harvesting your data', 'always listening', 'always watching', 'always tracking', 'digital slavery',
    'digital shackles', 'techno-feudalism', 'algorithmic control', 'algorithmic tyranny', 'artificial intelligence takeover', 'ai takeover', 'ai will replace', 'they\'re poisoning',
    'poison in your food', 'poison in your water', 'contaminated food supply', 'contaminated water supply', 'food supply under attack', 'attacking our food', 'frankenfoods', 'frankenfood',
    'toxic food', 'toxic water'
  ],
  
  // Us vs Them divisive language - ONLY clear dehumanizing/othering language
  // NOT legitimate political terms used in news reporting
  divisive: [
    // Direct dehumanization/othering
    'us vs them', 'us versus them', 'us against them',
    'real americans', 'true americans', 'real patriots', 'true patriots',
    'true believers', 'real christians', 'real conservatives', 'real liberals',
    'the enemy within', 'enemies of the people', 'enemy of the state',
    'enemies of freedom', 'enemies of democracy', 'enemy of america',
    // Purity/authenticity gatekeeping
    'not a real', 'fake conservative', 'fake liberal', 'fake christian',
    'rino', 'dino', 'in name only', 'sellout', 'sellouts',
    // Conspiracist group framing
    'the elite', 'elites', 'ruling elite', 'power elite', 'global elite',
    'the globalists', 'globalist agenda', 'new world order', 'nwo',
    'the cabal', 'secret cabal', 'shadow cabal', 'deep state',
    'the establishment', 'establishment elites', 'washington establishment',
    'swamp', 'drain the swamp', 'the swamp creatures',
    // Media distrust slogans
    'mainstream media lies', 'msm lies', 'media is lying',
    'fake news media', 'lamestream media', 'corporate media',
    'state-run media', 'propaganda machine', 'media conspiracy',
    // Political slurs (left-targeting)
    'snowflake', 'snowflakes', 'triggered snowflakes',
    'libtard', 'libtards', 'lib', 'libs',
    'woke mob', 'cancel mob', 'antifa', 'radical left',
    'socialist takeover', 'marxist agenda', 'communist agenda',
    'commie', 'commies', 'pinko', 'bolshevik',
    // Political slurs (right-targeting)
    'called a nazi', 'like nazis', 'actual fascist', 'actual fascists', 'white supremacist',
    'magat', 'trumper', 'trumpers', 'trumpist', 'trumpists',
    'q anon', 'qanon', 'cultist', 'cultists',
    // General dehumanization
    'traitor', 'traitors', 'treasonous', 'treason',
    'invader', 'invaders', 'invasion force',
    'mob', 'violent mob', 'angry mob', 'leftist mob', 'rightist mob',
    'thugs', 'these criminals', 'illegal criminals',
    'they are animals', 'like animals', 'these animals', 'savages',
    'sheeple', 'sheep', 'brainwashed', 'mindless followers',
    // Replacement/demographic fear
    'great replacement', 'replacement theory', 'white genocide',
    'being replaced', 'replacing us', 'destroy our culture',
    // Pejorative labels (cross-spectrum)
    'virtue signaling', 'virtue signalling',
    'race baiting', 'playing the race card',
    'woke agenda', 'woke ideology',
    'bleeding heart', 'bleeding hearts',
    'coastal elite', 'coastal elites', 'ivory tower',
    'thought police', 'speech police', 'language police',
    'social justice warrior', 'sjw', 'sjws',
    'nanny state',
    'cultural marxism', 'cultural marxist', 'cultural marxists',
    'useful idiot', 'useful idiots',
    'bootlicker', 'bootlickers', 'boot licker',
    'shill', 'shills', 'paid shill', 'corporate shill',
    'bought and paid for',
    'purity test', 'purity tests',
    'christofascist', 'christo-fascist',
    'bible thumper', 'bible thumpers',
    'class traitor',
    // Weaponized distrust labels
    'controlled by', 'bankrolled by', 'funded by',
    'on the payroll', 'in the pocket of',
    'wolf in sheep\'s clothing',
    // Modern polarization tactics
    'cancel culture', 'canceled for', 'cancelled for',
    'woke capitalism', 'woke corporation', 'go woke go broke',
    'politicized', 'weaponized against', 'weaponized by',
    'two-tiered justice', 'two-tier justice', 'rules for thee',
    'one set of rules', 'separate rules',
    // Conspiratorial group labels
    'globalist puppet', 'globalist puppets',
    'puppet president', 'puppet government',
    'manchurian candidate', 'trojan horse',
    'fifth column', 'enemy combatant',
    'foreign agent', 'domestic enemy', 'domestic enemies',
    // Identity weaponization
    'anti-white', 'anti-christian', 'anti-american', 'anti-family',
    'anti-god', 'anti-freedom', 'anti-liberty', 'anti-patriot',
    'war on christmas', 'war on religion', 'war on family',
    'war on freedom', 'war on values', 'war on tradition',
    // Tribal signaling
    'based', 'redpilled', 'blackpilled', 'bluepilled',
    'normie', 'normies', 'npc', 'npcs',
    // Digital age polarization
    'echo chamber', 'filter bubble', 'hive mind',
    'outrage mob', 'twitter mob', 'online mob',
    'virtue signal', 'performative activism', 'performative allyship',
    'slacktivism', 'keyboard warrior', 'keyboard warriors',
    'doomscrolling', 'rage bait', 'rage farming',
    'brigading', 'dogpile', 'dog pile', 'pile-on',
    'ratio\'d', 'ratioed', 'getting ratio\'d',
    // Othering through generalization
    'those types', 'that type of person', 'those kind of people',
    'your kind', 'your type', 'people like that',
    'the tolerant left', 'so much for tolerance',
    'facts don\'t care', 'facts over feelings',
    // Scapegoating
    'blame it on', 'blame it all on', 'it\'s all because of',
    'the root of all evil', 'at the root of the problem',
    'single-handedly ruined', 'single-handedly destroyed',
    'responsible for everything', 'fault of the'
  ],
  
  // Emotional manipulation / sensationalism / clickbait
  // Focus on patterns that indicate INTENT to manipulate emotions
  emotional: [
    // Direct emotional manipulation of reader
    'you won\'t believe', 'you will not believe', 'unbelievable that',
    'this will make you', 'this will leave you', 'this will have you',
    'wait until you see', 'wait till you see', 'just wait until',
    'prepare to be', 'get ready to be', 'brace yourself',
    'brought to tears', 'moved to tears', 'reduced to tears',
    'restored my faith', 'lost all faith', 'lost all hope',
    'you need to see', 'you have to see',
    'won\'t believe what', 'can\'t believe what', 'hard to believe',
    'left speechless', 'left stunned', 'left shocked',
    'broke the internet', 'the internet is losing', 'internet can\'t handle',
    'everyone is talking about', 'the world is watching',
    // Tabloid conflict language (multi-word phrases)
    'slams back', 'fires back', 'hits back', 'strikes back',
    'rips into', 'tears into', 'lashes out at', 'blasted for',
    'attacks back', 'responds savagely', 'brutal response',
    'epic takedown', 'savage takedown', 'brutal takedown',
    // Clickbait emotional hooks
    'epic fail', 'massive fail', 'spectacular fail',
    'cringeworthy', 'cringe-worthy', 'so cringe',
    'mind-blowing', 'mind blowing', 'mindblowing',
    'jaw-dropping', 'jaw dropping', 'breathtaking',
    'insane', 'absolutely insane', 'completely insane',
    'unreal', 'surreal', 'bonkers',
    // Celebrity/gossip sensationalism
    'shows off', 'showing off', 'flaunts her', 'flaunts his',
    'flaunting her', 'flaunting his', 'parading her', 'parading his',
    'sizzles in', 'dazzles in', 'stuns in', 'wows in',
    'barely there', 'barely wearing', 'almost nothing',
    'all eyes on', 'turns heads', 'steals the show',
    // Relationship/drama bait
    'feud with', 'bitter feud', 'explosive feud', 'ongoing feud',
    'public feud', 'war of words', 'war between',
    'snubs', 'snubbed', 'disses', 'dissed', 'throws shade',
    'betrayed by', 'cheated on', 'caught cheating',
    'messy divorce', 'nasty split', 'bitter breakup',
    // Pejorative labels (outrage-bait adjectives)
    'unhinged', 'completely unhinged', 'totally unhinged',
    'pathetic', 'absolutely pathetic', 'utterly pathetic',
    'delusional', 'completely delusional', 'totally delusional',
    'desperate', 'increasingly desperate', 'clearly desperate',
    'certifiably insane',
    'disgusting', 'absolutely disgusting', 'utterly disgusting',
    'shameless', 'completely shameless', 'brazenly',
    'disgraceful', 'utterly disgraceful', 'beyond disgraceful',
    'cowardly', 'spineless', 'gutless', 'weak-kneed',
    'horrifying', 'truly horrifying', 'deeply disturbing',
    'lap dog', 'lapdog', 'puppet', 'stooge', 'lackey', 'sycophant',
    'thug', 'goons', 'henchmen',
    'rioters', 'rioter', 'looters', 'looter',
    // Outrage-bait verbs (escalated conflict language)
    'melts down', 'meltdown', 'public meltdown', 'complete meltdown',
    'flips out', 'freaks out', 'loses it', 'completely loses it',
    'blows up', 'explodes on', 'erupts at',
    'obliterates', 'annihilates', 'eviscerates', 'decimates',
    'exposes the', 'finally exposes', 'brutally exposes',
    'unmasks', 'catches red-handed', 'caught red-handed',
    // Escalation verbs
    'blasts', 'torches', 'wrecks', 'nukes', 'demolishes',
    'shreds', 'rips apart', 'tears apart', 'takes apart',
    // Conspiracy framing language
    'cover up', 'cover-up', 'coverup', 'covering up',
    'orchestrating', 'orchestrated', 'master plan',
    'infiltrated', 'infiltrating', 'infiltration',
    'shadow government', 'shadow state',
    'secret plot', 'secret plan',
    'pulling the strings', 'behind the scenes', 'puppet master',
    'regime change', 'regime', 'junta',
    'tyranny', 'tyrannical', 'martial law', 'police state',
    'insurrection', 'coup', 'overthrow',
    // Moral panic language
    'groomer', 'groomers', 'grooming', 'predator', 'predators',
    'corrupting', 'indoctrinating', 'brainwashing',
    'destroying our', 'ruining our', 'taking away our',
    // Viral/engagement bait
    'goes viral', 'went viral', 'going viral',
    'clapback', 'clap back',
    'gets owned', 'got owned',
    'drops bombshell', 'dropped a bombshell',
    'gets destroyed by', 'gets demolished by',
    'the best response', 'perfect response to',
    // Loaded editorial language
    'feigns', 'feigned', 'feigning',
    'smears', 'smeared', 'smear campaign', 'smear job',
    'double standard', 'double standards',
    'playing the victim', 'victim card', 'victimhood',
    'crocodile tears', 'fake tears',
    'gaslighting', 'gaslight', 'gaslighter',
    'dog whistle', 'dog whistles',
    'straw man', 'strawman',
    'whataboutism', 'whatabout',
    // Tabloid framing
    'from hell',
    'ticking time bomb',
    'sparks outrage', 'sparks fury', 'sparks backlash',
    'triggers outrage', 'triggers fury', 'triggers backlash',
    'faces backlash', 'facing backlash',
    'under fire for', 'under fire over',
    'in hot water', 'in deep trouble',
    'comes under fire', 'came under fire',
    'slapped with', 'hit with',
    'caught on camera', 'caught on tape',
    'breaks silence', 'broke silence', 'breaking silence',
    // Narrative/credibility destruction
    'debunked by', 'debunked the',
    'caught in a lie', 'caught lying',
    'backpedaling', 'backtracking', 'flip-flopped', 'flip-flop',
    'contradicted himself', 'contradicted herself', 'contradicted themselves',
    'walking it back', 'walked it back',
    // Emotional temperature phrases
    'blood is boiling', 'boiling point', 'powder keg',
    'firestorm', 'storm is coming', 'perfect storm',
    'tipping point', 'breaking point', 'flashpoint', 'tinderbox',
    // Manufactured outrage intensifiers
    'absolute disgrace', 'total disgrace', 'utter disgrace',
    'beyond belief', 'beggars belief', 'defies belief',
    'words fail', 'there are no words', 'speechless',
    'sickened by', 'sickening to see', 'disgusted by',
    // Influencer/hustle culture manipulation
    'grind mindset', 'hustle culture', 'boss babe', 'girl boss',
    'level up', 'glow up', 'main character energy',
    'manifesting', 'speak it into existence', 'claim it',
    'your vibe attracts your tribe', 'high value',
    'if you can dream it', 'no excuses', 'winners never quit',
    // Toxic positivity
    'good vibes only', 'stay positive', 'positive vibes',
    'everything happens for a reason', 'look on the bright side',
    'just be grateful', 'could be worse', 'stay blessed',
    // Emotional manipulation in personal contexts
    'after everything I\'ve done', 'after all I\'ve done for you',
    'if you really cared', 'if you really loved me',
    'you owe me', 'you owe it to', 'the least you could do',
    'I sacrificed everything', 'I gave up everything',
    'you\'ll regret this', 'you\'ll be sorry', 'mark my words',
    // Propaganda technique language (timeless rhetorical devices)
    'the powers that be', 'powers that be',
    'the system is rigged', 'rigged system', 'rigged game',
    'deck is stacked', 'stacked against us',
    'asleep at the wheel', 'sleeping through', 'sleepwalking into',
    'willfully blind', 'willful blindness', 'willful ignorance',
    'blood on their hands', 'blood on your hands',
    'sold us out', 'sold out our', 'selling us out',
    'thrown under the bus', 'throwing us under',
    'stabbed in the back', 'backstabbed', 'back-stabbed',
    'wolves in sheep\'s clothing', 'sheep in wolves\' clothing',
    // Manufactured authority
    'insider information', 'inside information', 'inside sources',
    'well-placed sources', 'sources close to',
    'whistleblower reveals', 'bombshell revelation',
    'bombshell report', 'explosive report',
    'damning evidence', 'damning report', 'damning revelation',
    // Emotional priming
    'what every parent needs to know', 'what every american needs to know',
    'the one thing you need to know', 'the truth about',
    'what nobody is saying', 'what nobody wants to say',
    'the elephant in the room', 'nobody is addressing',
    'the silence is deafening', 'conspicuous silence',
    // Quasi-religious/prophetic
    'chosen ones', 'the awakened', 'the enlightened few',
    'spiritual warfare', 'spiritual battle', 'the remnant',
    'end-times prophecy', 'biblical prophecy fulfilled',
    'divine retribution', 'divine punishment', 'heaven\'s judgment'
  ],
  
  // ALL CAPS emphasis words - sign of sensationalism
  // These need to be matched case-sensitively
  allCaps: [
    'SHOCKING', 'OUTRAGEOUS', 'EXPLOSIVE', 'BOMBSHELL', 'STUNNING', 'OUTRAGE', 'OUTRAGED', 'FURIOUS',
    'LIVID', 'EXPOSED', 'BUSTED', 'CAUGHT', 'NAILED', 'GOTCHA', 'URGENT', 'WARNING',
    'ALERT', 'EMERGENCY', 'LEAKED', 'SCANDAL', 'SCANDALOUS', 'HORRIFYING', 'TERRIFYING', 'CHILLING',
    'NIGHTMARE', 'DISGUSTING', 'SICKENING', 'REVOLTING', 'INSANE', 'UNHINGED', 'DERANGED', 'CRAZY',
    'SLAMS', 'DESTROYS', 'OBLITERATES', 'ANNIHILATES', 'EVISCERATES', 'FIRES BACK', 'HITS BACK', 'STRIKES BACK',
    'BLASTS', 'TORCHES', 'WRECKS', 'DEMOLISHES', 'CATASTROPHE', 'CATASTROPHIC', 'COLLAPSE', 'COLLAPSED',
    'CRISIS', 'DISASTER', 'DISASTROUS', 'MELTDOWN', 'TORTURE', 'TORTURED', 'MURDER', 'MURDERED',
    'EXTINCTION', 'GENOCIDE', 'INVASION', 'FRAUD', 'SCAM', 'HOAX', 'LIE', 'LIES',
    'RICO', 'RIGGED', 'STOLEN', 'CORRUPT', 'CORRUPTION', 'TRAITOR', 'TRAITORS', 'TREASON',
    'BETRAYED', 'HUMILIATED', 'CRUSHED', 'DEVASTATED', 'BREAKING', 'EXCLUSIVE', 'CONFIRMED', 'DEVELOPING',
    'JUST IN', 'WATCH', 'LOOK', 'MEGA', 'MASSIVE', 'HUGE', 'ENORMOUS', 'EPIC',
    'BANNED', 'CENSORED', 'SILENCED', 'DELETED', 'WIPED', 'ERASED', 'PROOF', 'ADMIT',
    'ADMITS', 'ADMITTED', 'REVEALED', 'UNCOVERED', 'UNMASKED', 'UNBELIEVABLE', 'INCREDIBLE', 'REVOLT',
    'REVOLUTION', 'UPRISING', 'WAKE UP', 'SICK', 'SHAMEFUL', 'DISGRACEFUL', 'PATHETIC', 'TREASONOUS',
    'CRIMINAL', 'DESTROYED', 'SLAMMED', 'BLASTED', 'OBLITERATED', 'TORCHED', 'WRECKED', 'DEMOLISHED',
    'ANNIHILATED', 'CRITICAL', 'FINAL', 'RUN', 'NOW', 'STOP', 'HELP', 'GUILTY',
    'LIAR', 'VICTORY', 'WINNING', 'BOOM'
  ],
  
  // Call to action with urgency - focus on DIRECT manipulation of reader
  urgency: [
    // Social media amplification requests
    'share this', 'share now', 'share before', 'please share',
    'share with everyone', 'share with your friends',
    'spread the word', 'spread this', 'get the word out',
    'tell everyone', 'tell your friends', 'let everyone know',
    'must watch this', 'you need to read this',
    'read this now', 'watch this now', 'see this before',
    // Deadline/scarcity
    'now or never', 'last chance', 'final chance', 'only chance',
    'final warning', 'last warning', 'one last chance',
    'act now', 'act today', 'act immediately', 'take action now',
    'before it\'s too late', 'before they', 'before this gets',
    'time is running out', 'running out of time', 'not much time',
    'clock is ticking', 'every second counts', 'don\'t delay',
    // Suppression narrative
    'before it gets deleted', 'before they remove', 'before it\'s censored',
    'they\'re trying to silence', 'being suppressed', 'being censored',
    'won\'t be up for long', 'taking this down', 'deleted soon',
    'banned from sharing', 'they don\'t want you to share',
    // Exclusivity/insider
    'you heard it here first', 'exclusive report', 'breaking exclusive',
    'insider reveals', 'leaked exclusively', 'only we are reporting',
    // Social media amplification pressure
    'please watch', 'please read', 'please listen',
    'you need to hear this', 'you need to know this',
    'make this go viral', 'make it viral',
    'repost this', 'retweet this',
    'tag someone', 'tag a friend', 'tag everyone',
    'save this before', 'bookmark this', 'screenshot this',
    'this changes everything',
    'wake up people', 'wake up america', 'wake up world',
    // Call-to-pressure phrases
    'demand answers', 'demand accountability', 'demand justice',
    'hold them accountable', 'make them pay',
    'stand up now', 'rise up', 'fight back',
    'do your part', 'do something about it',
    'enough is enough', 'when is enough',
    'we can\'t let this', 'we must not let this',
    'the time is now', 'the time has come',
    // Manufactured exclusivity/insider knowledge
    'they don\'t want this shared', 'they tried to stop',
    'the video they don\'t want', 'the article they don\'t want',
    'the post they keep deleting', 'keeps getting taken down',
    // Positive manipulation / recruitment tactics
    'once in a lifetime', 'life-changing opportunity',
    'ground floor opportunity', 'get in early',
    'limited spots available', 'spots are filling up',
    'this is not a scam', 'this is not mlm', 'this is not a pyramid',
    'proven system', 'proven method', 'proven formula',
    'six-figure income', 'seven-figure', 'replace your income',
    'fire your boss', 'quit your job', 'ditch the 9-to-5',
    'secret the rich', 'secret millionaires', 'wealth secret',
    'money while you sleep', 'earn while you sleep',
    // Countdown/disappearing content pressure
    'going live in', 'starting in', 'happening now',
    'happening right now', 'this is happening',
    'it\'s happening', 'it has begun', 'it\'s begun',
    'the countdown has started', 'countdown is on',
    'don\'t miss out', 'don\'t miss this',
    'you\'re going to miss', 'going to miss out',
    'don\'t wait', 'stop waiting', 'stop scrolling',
    // Humanitarian/moral urgency exploitation
    'every minute you wait', 'every second you delay',
    'while you sit there', 'while you do nothing',
    'your silence is complicity', 'silence is violence',
    'silence is consent', 'your inaction',
    'people are dying', 'children are dying', 'lives are at stake',
    'blood is on your hands', 'this is on you',
    // Conspiratorial urgency
    'before the truth is buried', 'before history is rewritten',
    'before the evidence disappears', 'before witnesses disappear',
    'before they memory hole', 'memory-holed',
    'before the cover-up', 'the cover-up has begun',
    'the purge has started', 'the crackdown is coming',
    // Digital/social media urgency
    'algorithm is burying this', 'algorithm is hiding',
    'shadow-banned', 'shadowbanned', 'being throttled',
    'reach is being limited', 'being de-platformed',
    'help this reach more', 'boost this', 'amplify this',
    // Investment/financial urgency
    'buy the dip', 'this is the dip', 'to the moon',
    'diamond hands', 'paper hands', 'don\'t sell',
    'hold the line', 'we like the stock',
    'rocket ship', 'about to explode', 'about to moon',
    'last chance to buy', 'price won\'t stay',
    'don\'t get left behind', 'train is leaving'
  ]
};

// ============================================================================
// STRUCTURAL MANIPULATION PATTERNS
// ============================================================================
// Regex-based detection of manipulation STRUCTURES rather than specific vocabulary.
// These detect timeless persuasion techniques that work regardless of which
// specific words or slang are used. They complement the word-list patterns above
// by catching novel phrasings that follow known manipulative structures.
//
// Organized by the same categories as MANIPULATION_PATTERNS for seamless
// integration into the scoring pipeline and UI breakdown.
// ============================================================================
const STRUCTURAL_PATTERNS = {
  fear: [
    // Second-person pressure: "you must/need to/have to [act/prepare/fight/...]"
    // Catches novel combinations beyond the fixed phrases in MANIPULATION_PATTERNS
    /\byou (?:must|need to|have to|should|ought to|had better|better) (?:\w+ ){0,3}(?:act|prepare|protect|fight|resist|wake up|realize|understand|see|hear|learn|know|watch|read|listen|pay attention|open your eyes|take action)\b/gi,

    // "Are you [prepared|afraid|safe]?" — rhetorical fear prompt
    /\bare you (?:prepared|ready|afraid|aware|worried|concerned|safe|paying attention|awake)\b/gi,

    // Personal threat framing: "your X is at risk/in danger/under attack"
    /\byour\b[^.!?\n]{0,15}\b(?:at risk|in danger|threatened|under attack|at stake|not safe|being (?:taken|stolen|destroyed|monitored|tracked|recorded|surveilled|violated))\b/gi,

    // Suppression narrative: unnamed authority hiding information
    /\b(?:they|the (?:government|media|establishment|elites?|powers that be))[^.!?\n]{0,30}(?:don't want|doesn't want|trying to (?:hide|silence|censor|suppress)|(?:is |are )?hiding(?: this)? from|covering up|burying|scrubbing)\b/gi,
    /\bbefore (?:it'?s|it gets|they|this is|this gets) (?:deleted|removed|censored|banned|taken down|scrubbed|buried|memory[- ]?holed)\b/gi,

    // Apocalyptic framing: end-times predictions
    /\b(?:the (?:storm|collapse|fall|destruction|reckoning|apocalypse))[^.!?\n]{0,20}(?:is (?:coming|upon us|here|near|imminent)|has (?:begun|arrived|started))\b/gi,
    /\b(?:it'?s (?:already )?too late|past the point of no return|no going back|no turning back|beginning of the end)\b/gi,
    /\b(?:mark my words|you'?ll see|I warned you|tick[- ]?tock)\b/gi,

    // Doomsday countdown: "X days/weeks/months until [catastrophe]"
    /\b\d+\s+(?:days?|weeks?|months?|hours?)\s+(?:until|before|left|remaining)\b[^.!?\n]{0,30}\b(?:collapse|disaster|catastrophe|crisis|deadline|too late|end|meltdown)\b/gi,

    // Fear-uncertainty-doubt (FUD): "just asking questions", hedged accusations
    /\b(?:just asking questions|just asking|i'?m just saying|some people say|some are saying|many are saying|many people (?:believe|think|say|are saying))\b/gi,

    // Forbidden knowledge teaser: "what they don't teach you", "what X won't tell you"
    /\bwhat (?:they|the (?:media|schools?|government|doctors?|experts?))[^.!?\n]{0,15}(?:don'?t|won'?t|refuse to|will never) (?:tell|teach|show|reveal|admit)\b/gi,

    // Conspiratorial certainty: "it's no coincidence", "connect the dots"
    /\b(?:it'?s no coincidence|there are no coincidences?|connect the dots|follow the money|do your (?:own )?research|look it up|open your eyes|do the math)\b/gi,

    // Distrust of official narrative: "mainstream", "narrative", "agenda"
    /\b(?:the (?:official|mainstream|corporate|state|establishment) (?:narrative|storyline|version|propaganda|agenda|talking points))\b/gi,
    /\b(?:wake up (?:sheeple|people|america|world|folks)|wool over (?:your|our|their) eyes)\b/gi,

    // Gish gallop detector: rapid-fire rhetorical question barrage (3+ questions in short span)
    /(?:[^.!?\n]*\?[^.!?\n]{0,40}\?[^.!?\n]{0,40}\?)/g,

    // Moving goalposts / deflection chains: "but what about", "that's not the point", "focus on the real"
    /\b(?:that'?s not (?:the (?:point|issue|problem|question))|you'?re missing the (?:point|bigger picture)|the real (?:issue|problem|question|story) (?:is|here))\b/gi,

    // Slippery slope: "if we allow X, next they'll Y", "first they came for"
    /\b(?:if we (?:allow|let|permit|accept|tolerate))[^.!?\n]{0,30}\b(?:next|then|soon|before (?:long|you know)|what'?s (?:next|stopping))\b/gi,
    /\b(?:first they (?:came for|took|banned|censored|silenced))[^.!?\n]{0,30}\b(?:then|next|now|soon)\b/gi,
    /\b(?:today it'?s|today they|tomorrow (?:it'?ll|they'?ll|it will)|where does it (?:end|stop)|what'?s next|slippery slope)\b/gi,

    // Nostalgic decline: "back in my day", "this country used to be", idealized past
    /\b(?:back in (?:my|the|our) day|this (?:country|nation|world) used to|remember when|things were (?:better|different|simpler)|(?:we|they|it) used to be (?:great|safe|better|free|different))\b/gi,

    // Medical misinformation structural patterns
    /\b(?:big pharma|the (?:pharmaceutical|medical) (?:industry|establishment|cartel|mafia))\b[^.!?\n]{0,20}\b(?:doesn'?t want|is hiding|won'?t tell|is suppressing|is covering|profits from|makes money)\b/gi,
    /\b(?:natural (?:immunity|cure|remedy|treatment|alternative))\b[^.!?\n]{0,25}\b(?:they don'?t want|the (?:government|doctors?|pharma|media) (?:won'?t|doesn'?t|don'?t)|is being (?:suppressed|censored|hidden|ignored))\b/gi,
    /\b(?:adverse (?:reactions?|effects?|events?|side effects?))\b[^.!?\n]{0,20}\b(?:they (?:won'?t|don'?t|refuse to)|being (?:hidden|covered|censored|suppressed|ignored)|the media (?:won'?t|refuses?|isn'?t))\b/gi,

    // Economic fear-mongering: imminent financial collapse
    /\b(?:the (?:economy|market|dollar|currency|financial system|banking system) (?:is (?:about to|going to|on the verge of)|will) (?:collapse|crash|implode|fail|crumble|tank|melt down))\b/gi,
    /\b(?:get your money out|move your (?:money|savings|assets)|buy (?:gold|silver|crypto|bitcoin) (?:now|before|while you (?:still )?can))\b/gi,

    // Surveillance/privacy panic: "they're watching/tracking/listening"
    /\b(?:they'?re (?:watching|tracking|listening|monitoring|recording|surveilling|spying on) (?:you|us|everyone|everything))\b/gi,
    /\b(?:your (?:phone|device|smart ?(?:phone|tv|speaker)|alexa|siri|camera) (?:is (?:listening|watching|recording|tracking|spying)|records everything))\b/gi,

    // Historical analogy fear: comparing mundane events to atrocities
    /\b(?:this is (?:just |exactly )?like|(?:shades|echoes|reminiscent|eerily similar) (?:of )?)\b[^.!?\n]{0,15}\b(?:nazi|hitler|stalin|mao|1984|orwell|pol pot|fascis[tm]|holocaust|genocide|concentration camp|gulag|apartheid|slavery|communist|marxist|bolshevik)\b/gi,
  ],

  divisive: [
    // False dichotomy: forcing binary choices
    /\b(?:you'?re either|you are either)[^.!?\n]{0,60}\bor\b/gi,
    /\b(?:pick a side|choose a side|which side are you|with us or against|love it or leave)\b/gi,
    /\b(?:no (?:middle ground|room for (?:compromise|nuance|debate)))\b/gi,

    // Enemy framing: unnamed powerful enemies
    /\b(?:shadowy|mysterious|unnamed|powerful|sinister|dark|nefarious) (?:figures?|forces?|groups?|entities|interests|cabal|network|operatives?|actors?|powers?)\b/gi,

    // "They" as conspiratorial enemy with specific intent
    /\bthey (?:are plotting|are planning|want to (?:destroy|control|enslave|replace|silence|eliminate)|are coming for|will stop at nothing|want (?:us|you) (?:dead|gone|silenced|enslaved))\b/gi,

    // Scare quotes around authority/legitimacy terms
    /["\u201c](?:experts?|scientists?|research|evidence|facts?|news|journalists?|democracy|freedom|justice|safe|effective|vaccine|progress|diversity|tolerance|peaceful|fact[- ]?check)["\u201d]/gi,

    // Authority dismissal: delegitimizing expertise through pejoratives
    /\b(?:so[- ]called|self[- ]proclaimed|self[- ]appointed|alleged|supposed|wannabe) (?:experts?|scientists?|journalists?|doctors?|specialists?|authorities|professors?|intellectuals?|analysts?|fact[- ]?checkers?|researchers?)\b/gi,

    // Gatekeeping/loyalty testing: "real X know/understand/believe"
    /\b(?:real|true|loyal|patriotic|god[- ]fearing) (?:patriots?|americans?|christians?|believers?|citizens?|men|women|conservatives?|liberals?)\b[^.!?\n]{0,15}\b(?:know|understand|believe|see|recognize|support|would never)\b/gi,

    // In-group/out-group labeling: "those people", "these people"
    /\b(?:those|these) people\b[^.!?\n]{0,20}\b(?:are|want|don'?t|won'?t|can'?t|refuse|always|never)\b/gi,

    // Purity testing: "you can't call yourself X if you..."
    /\b(?:you can'?t call yourself|you'?re not (?:a )?real|you'?re no (?:true|real)|if you were a real)\b/gi,

    // Tribal absolutism: "every X is/does", "all X are/want"
    /\b(?:every|all) (?:liberals?|conservatives?|democrats?|republicans?|(?:left|right)[- ]?(?:ists?|wingers?)|immigrants?|muslims?|christians?|feminists?|boomers?|millennials?|progressives?)\b[^.!?\n]{0,15}\b(?:are|is|want|hate|love|support|oppose|destroy|refuse)\b/gi,

    // False equivalence: "X is just as bad as Y" (minimizing one side by equating)
    /\b(?:just as bad|equally guilty|no different (?:from|than)|same as the|both sides are|two sides of the same)\b/gi,

    // Strawman framing: attributing extreme positions ("they want to X every Y")
    /\b(?:they (?:want to|are trying to)) (?:\w+ ){0,3}(?:every|all|each|any) (?:\w+ ){0,2}(?:in (?:the|this|our) (?:country|nation|world|society))\b/gi,

    // Demographic scapegoating: blaming entire generations/groups for problems
    /\b(?:(?:boomers?|millennials?|gen[- ]?z|zoomers?|immigrants?|refugees?) (?:are |have )?(?:ruining|destroying|killing|wrecking))\b[^.!?\n]{0,20}\b(?:the (?:economy|country|nation|world|housing|job)|everything)\b/gi,
    /\b(?:(?:thanks to|because of|blame) (?:the )?(?:boomers?|millennials?|gen[- ]?z|immigrants?|refugees?|liberals?|conservatives?))\b[^.!?\n]{0,20}\b(?:(?:we|the country|the economy|everything|our) (?:is|are|has|have|can'?t|won'?t))\b/gi,

    // Dehumanizing language: reducing people to vermin/disease/infestation metaphors
    /\b(?:(?:they'?re |these )?(?:infesting|invading|swarming|overrunning|flooding|contaminating|poisoning|polluting|breeding|multiplying))\b[^.!?\n]{0,15}\b(?:our (?:country|nation|cities|towns|neighborhoods?|schools?|communities?))\b/gi,

    // Conspiratorial "replacement" narratives
    /\b(?:being (?:replaced|erased|silenced|marginalized|displaced|bred out|phased out|made (?:irrelevant|obsolete|extinct)))\b[^.!?\n]{0,20}\b(?:by (?:design|the (?:government|left|right|elites?|establishment))|on purpose|intentionally|deliberately|systematically)\b/gi,
  ],

  urgency: [
    // Imperative + time pressure (catches novel verb+deadline combinations)
    /\b(?:act|share|watch|read|sign|call|vote|donate|join|fight|resist|speak out|take action|do something)\b[^.!?\n]{0,15}\b(?:now|today|immediately|before|while you still|right now)\b/gi,

    // "Don't [wait|hesitate|delay|be fooled]" — imperative negation urgency
    /\b(?:don'?t|do not) (?:wait|hesitate|delay|miss this|miss out|ignore|stay silent|be fooled|be deceived|fall for)\b/gi,

    // Social media amplification pressure
    /\b(?:make (?:this|it) (?:go )?viral|repost this|screenshot this|save this (?:before|now)|bookmark this before)\b/gi,

    // Countdown urgency: "only X left", "limited time"
    /\b(?:only|just) \d+\s+(?:days?|hours?|minutes?|spots?|seats?|tickets?|copies?)\s+(?:left|remaining|available)\b/gi,

    // "Last chance" / deadline urgency
    /\b(?:last chance|final warning|final opportunity|last opportunity|closing soon|ending soon|expires? (?:today|tonight|soon|tomorrow))\b/gi,

    // Suppression-driven urgency: "before they remove/delete/censor"
    /\b(?:before (?:they|it gets?|this gets?|it'?s) (?:removed|deleted|censored|banned|taken down|silenced|buried|scrubbed))\b/gi,

    // Time running out: "we're running out of time", "the clock is ticking"
    /\b(?:(?:we'?re |you'?re )?running out of (?:time|options)|(?:the )?clock is ticking|every (?:second|minute|moment) counts|time (?:is (?:of the essence|not on our side)|waits for no one))\b/gi,

    // NOW-or-never pressure: "if not now, when?"
    /\b(?:if not now,? (?:when|then when)|now or never|do it (?:now|today) or|it'?s now or never|there (?:is|'?s) no (?:time|room) (?:left|to (?:waste|lose|delay)))\b/gi,

    // Chain letter / forward-this urgency: social media pressure waves
    /\b(?:forward this to|send this to|share (?:with|to) (?:everyone|all your|at least \d+)|copy (?:and )?paste (?:this|before)|put this (?:on|in) your (?:status|profile|wall|story|feed))\b/gi,

    // Manufactured deadline: "this expires/ends/disappears at midnight"
    /\b(?:this (?:expires?|ends?|disappears?|goes away|won'?t (?:be|last)) (?:at|by|tonight|tomorrow|midnight|end of (?:day|week|month))|offer (?:expires?|ends?) (?:at|by|in \d+|tonight|tomorrow|midnight))\b/gi,

    // Fear of missing out (FOMO) escalation
    /\b(?:while (?:stocks?|supplies|spots?|seats?) last|(?:get|grab|claim|reserve) your(?:s|'s)? (?:now|today|before)|don'?t be (?:the (?:last|only) one|left (?:behind|out))|everyone (?:else )?(?:is (?:already|getting)|has already)|you'?re (?:falling|being left) behind)\b/gi,
  ],

  emotional: [
    // Social proof manipulation: manufactured consensus
    /\b(?:everyone|everybody|nobody|no one) (?:\w+ ){0,2}(?:knows|agrees|believes|can see|understands|is saying|recognizes)\b/gi,
    /\b(?:millions|thousands|countless)(?:\s+(?:of\s+)?(?:people\s+)?)(?:\w+ ){0,2}(?:agree|believe|are waking|are realizing|are demanding|have signed|are rising|are fed up)\b/gi,
    /\bthe (?:whole|entire) (?:world|country|nation|internet) (?:is (?:watching|talking|outraged|stunned|shocked)|knows|agrees)\b/gi,

    // Intensifier stacking: emotional modifier pile-up
    /\b(?:absolutely|completely|totally|utterly|truly|deeply|incredibly|extremely|unbelievably) (?:shocking|horrifying|disgusting|outrageous|terrifying|devastating|disturbing|sickening|heartbreaking|appalling|horrific|despicable|repulsive|unacceptable|shameful|disgraceful)\b/gi,

    // Emotional headline framing: "[Emotion] as/after/over [event]"
    /\b(?:horror|shock|fury|outrage|chaos|panic|fear|alarm|terror|heartbreak|tragedy|scandal|backlash|uproar) (?:as|after|when|over|erupts|grows|mounts)\b/gi,

    // Sensational modifier + revelation noun
    /\b(?:devastating|shocking|horrifying|terrifying|disturbing|chilling|sickening|heartbreaking|jaw[- ]dropping|bombshell|explosive|damning|blistering|withering|crushing|damaging|damaging) (?:revelation|report|discovery|footage|video|images?|photos?|evidence|details?|truth|findings?|claims?|allegations?|development|twist|blow|update)\b/gi,

    // Rhetorical manipulation questions: "How can anyone...?"
    /\b(?:how can anyone|how could anyone|how dare|why won'?t they|why doesn'?t anyone)[^.!?\n]{0,60}\?/gi,
    /\b(?:isn'?t it (?:obvious|clear|strange|suspicious|convenient|telling)|don'?t you (?:think|see|find it|wonder|realize|get it))\b/gi,

    // Excessive punctuation: 3+ exclamation/question marks
    /[!?]{3,}/g,

    // Appeal to nature/tradition/common sense fallacies
    /\b(?:our (?:ancestors|forefathers|grandparents) (?:knew|understood)|ancient wisdom|common sense (?:tells|says|dictates)|stands to reason|self-evident|undeniable fact|undeniably true)\b/gi,

    // Victim/persecution narrative: "attacked/silenced for telling the truth"
    /\b(?:attacked|punished|silenced|cancelled|canceled|censored|banned|fired|persecuted|targeted) (?:for|because|just for) (?:telling|speaking|saying|sharing|exposing|revealing)\b[^.!?\n]{0,20}\b(?:truth|facts?|what (?:really|actually))\b/gi,

    // Whataboutism: deflection via comparison
    /\b(?:what about|but what about|yeah but what about|how about when)\b[^.!?\n]{0,40}\b(?:did|does|was|were|said|when)\b/gi,

    // Emotional blackmail: "if you care about X, you'll Y"
    /\b(?:if you (?:really |truly )?(?:care|love|value|believe in))\b[^.!?\n]{0,30}\b(?:you'?ll|you (?:will|would|should|must))\b/gi,

    // Clickbait title structures: "X reasons why", "You won't believe", "What happened next"
    /\b\d+\s+(?:reasons?|ways?|things?|facts?|secrets?|signs?|tricks?|hacks?|tips?)\b[^.!?\n]{0,20}\b(?:why|that|you|no one|nobody|they|the (?:media|government))\b/gi,
    /\b(?:you won'?t believe|you'?ll never guess|you'?ll never believe|what happened next|wait (?:until|till|for) (?:you see|the end|it)|the reason will|the answer will)\b/gi,
    /\b(?:this (?:one|simple) (?:trick|hack|secret|thing|tip))\b[^.!?\n]{0,20}\b(?:will|that|can|could)\b/gi,
    /\b(?:what (?:they|nobody|no one|experts?) (?:told|teach|tell|show|reveal|want))\b/gi,

    // Engagement bait: "Comment if", "Like if", "Share if you agree"
    /\b(?:comment|like|share|retweet|repost|subscribe|follow|tag) (?:if you|this if|if this|below if)\b/gi,
    /\b(?:do you agree|agree or disagree|yes or no|thoughts|what do you think|drop a|leave a) (?:in the comments?|below|here|your)\b/gi,

    // Emotional authority appeal: "As a mother/veteran/doctor"
    /\bas a (?:mother|father|parent|veteran|teacher|nurse|doctor|first responder|survivor|victim|concerned citizen|taxpayer|patriot)\b[^.!?\n]{0,20}\b(?:I (?:can|must|have to|need to)|this (?:is|hits|breaks|makes))\b/gi,

    // Anecdotal generalization: personal story as universal proof
    /\b(?:I (?:personally |)(?:know|saw|heard|witnessed|experienced))\b[^.!?\n]{0,30}\b(?:and (?:so do|it'?s)|which (?:proves?|shows?|means?)|therefore|so (?:clearly|obviously|that proves?))\b/gi,

    // Loaded headline verbs: sensationalized action (case-insensitive to catch both headline and body usage)
    /\b\w+\s+(?:slams?|blasts?|destroys?|eviscerates?|torches?|rips?|shreds?|obliterates?|demolishes?|annihilates?|crushes?|wrecks?|savages?|roasts?|claps? back(?: at)?|fires? back(?: at)?|hits? back(?: at)?|strikes? back(?: at)?|tears? (?:into|apart)|lashes? out(?: at)?|goes? (?:off|ballistic)|melts? down|unloads? on|takes? down|drops? (?:a )?bombshell)\b/gi,

    // "EXPOSED" / "CAUGHT" / "BUSTED" revelation language
    /\b(?:exposed|caught|busted|unmasked|revealed|outed)\b[^.!?\n]{0,20}\b(?:doing|saying|lying|cheating|stealing|hiding|covering|secretly|in (?:the )?act)\b/gi,

    // Moral outrage framing: "this is what's wrong with X"
    /\b(?:this is (?:what'?s|exactly what'?s) (?:wrong|broken|sick|rotten)|this is why we can'?t|this is why (?:society|america|the world|everything) is)\b/gi,

    // Prophecy structure: "I predicted/called it/told you so"
    /\b(?:I (?:predicted|called it|told you|warned you|knew it|saw this coming)|called it|told you so|just as (?:I|we) (?:predicted|warned|said|feared))\b/gi,

    // Catastrophizing scope: "every single", "each and every", "without exception"
    /\b(?:every single|each and every|without exception|not a single|without fail|every last|absolutely (?:no|every|all))\b/gi,

    // Bandwagon / peer pressure: "everyone is switching to", "why are so many people"
    /\b(?:everyone is (?:switching|moving|turning|waking|leaving|abandoning|ditching|dumping)|why are so many (?:people|americans?|citizens?) (?:leaving|switching|turning|waking))\b/gi,

    // Emotion over evidence: "I don't care what the data says", "statistics lie"
    /\b(?:I don'?t care (?:what|about) (?:the (?:data|statistics|numbers|evidence|experts?|research)|what anyone (?:says|thinks))|statistics (?:lie|can be|are misleading|don'?t tell)|numbers (?:lie|can be|are misleading|don'?t tell))\b/gi,

    // Sealioning / concern trolling: "I'm just concerned about", "I'm just trying to understand why"
    /\b(?:I'?m just (?:concerned|worried|curious|wondering|trying to understand)|not trying to be (?:rude|mean|controversial) but|no offense but|with all due respect but)\b[^.!?\n]{0,40}\b(?:why|how come|don'?t you|can'?t we|shouldn'?t we)\b/gi,

    // Thought-terminating cliche: "it is what it is", "end of story", "period"
    /\b(?:it is what it is|end of (?:story|discussion|debate)|case closed|enough said|nuff said|nothing (?:more|else) to (?:say|discuss|add)|full stop|that'?s (?:all there is|just how it is|the bottom line))\b/gi,

    // Positive manipulation: MLM/cult/prosperity gospel recruitment language
    /\b(?:financial freedom|be your own boss|passive income|time freedom|work from (?:home|anywhere)|residual income|unlimited (?:income|earning|potential))\b[^.!?\n]{0,30}\b(?:join|sign up|opportunity|team|tribe|family|community|movement)\b/gi,
    /\b(?:join (?:my|our|the) (?:team|tribe|family|community|movement|revolution|mission))\b[^.!?\n]{0,20}\b(?:and (?:start|begin|transform|change|discover)|to (?:start|begin|transform|change|discover))\b/gi,
    /\b(?:this (?:product|program|system|method|course|opportunity) (?:changed|transformed|saved) (?:my|our|his|her|their) (?:life|marriage|health|finances?|career|business|family))\b/gi,

    // Prosperity gospel / abundance manipulation
    /\b(?:claim your|claim the|receive your|unlock your|manifest your|attract (?:your|the)|tap into your) (?:blessing|abundance|prosperity|destiny|miracle|wealth|divine|purpose|birthright|inheritance)\b/gi,

    // Fake urgency scarcity: "only X spots left", "limited time"
    /\b(?:only \d+ (?:spots?|seats?|slots?|places?|copies|left)|limited (?:spots?|seats?|availability|supply|edition|offer|time (?:only|offer|deal))|selling (?:out )?fast|almost (?:gone|sold out)|don'?t miss (?:out|this)|act (?:fast|quickly|now))\b/gi,

    // Testimonial manipulation: fabricated social proof
    /\b(?:I (?:lost|gained|earned|made|saved) (?:\$[\d,]+|\d+ (?:pounds?|kg|lbs?)) (?:in (?:just |only )?\d+ (?:days?|weeks?|months?)))\b/gi,

    // Gaslighting patterns: "you're overreacting", "that never happened"
    /\b(?:you'?re (?:overreacting|being (?:too sensitive|dramatic|paranoid|ridiculous|irrational|crazy))|that (?:never|didn'?t) happen|you'?re imagining (?:things|it)|you'?re (?:making|blowing) (?:this|it) (?:up|out of proportion))\b/gi,

    // Ad hominem: attacking the person instead of the argument
    /\b(?:consider the source|what (?:do|would) you (?:expect|know)|you'?re (?:just|only) a|typical (?:response from|behavior from)|of course (?:they|he|she) would say that|that'?s rich coming from)\b/gi,

    // Emotional anchoring: associating with sacred/revered concepts to shut down debate
    /\b(?:our (?:founding fathers|ancestors|forefathers) (?:would|are)|(?:god|jesus|the bible|the constitution|the founders?) (?:says?|tells?|commands?|demands?|warns?))\b[^.!?\n]{0,20}\b(?:that|us|we|you|this)\b/gi,

    // Guilt by association: "X supports/associates with Y, therefore X is Z"
    /\b(?:(?:he|she|they) (?:once |)(?:supported|endorsed|praised|associated with|met with|was seen with))\b[^.!?\n]{0,30}\b(?:which (?:means|proves|shows)|so (?:clearly|obviously|that tells)|therefore|enough said)\b/gi,

    // Motte-and-bailey detector: retreating to a defensible position
    /\b(?:that'?s not what (?:I|we) (?:meant|said|were saying)|(?:I|we) never said|you'?re (?:twisting|distorting|misrepresenting) (?:my|our|what))\b[^.!?\n]{0,20}\b(?:what (?:I|we) (?:actually|really) (?:meant|said)|the point (?:is|was))\b/gi,

    // Appeal to nature: "natural = good, artificial = bad" fallacy
    /\b(?:it'?s (?:natural|organic|holistic)|nature intended|god intended|the way (?:nature|god) (?:designed|made|intended))\b[^.!?\n]{0,20}\b(?:so it (?:must|has to) be|therefore|which (?:means|proves)|unlike (?:the )?(?:chemical|synthetic|artificial|man-made|processed))\b/gi,

    // Tu quoque (you did it too): deflecting criticism by accusing the accuser
    /\b(?:but (?:you|they|your side|your party) (?:also|did|does|supported|voted for)|what about when (?:you|they|your)|where were you when|you (?:did|said|supported) the same (?:thing|exact))\b/gi,

    // Red herring: introducing irrelevant topic to divert attention
    /\b(?:the (?:real|bigger|actual|important) (?:question|issue|story|problem|concern) (?:is|here is|should be|nobody is asking))\b[^.!?\n]{0,25}\b(?:why|how|what|where|who|when)\b/gi,

    // False cause: "X happened, then Y happened, therefore X caused Y"
    /\b(?:(?:ever since|right after|just after|immediately after) (?:they|we|he|she|the government|the media))\b[^.!?\n]{0,50}\b(?:(?:and )?(?:now|suddenly|coincidentally|mysteriously|strangely) (?:we|they|people|everyone|everything))\b/gi,

    // Red herring: introducing irrelevant topic to divert attention (variant 2)
    /\b(?:let'?s not forget|let'?s not ignore|let'?s talk about|but nobody (?:is )?(?:talking|asking) about)\b[^.!?\n]{0,30}\b(?:the real|what really|what actually|the fact that)\b/gi,

    // Appeal to emotion over logic: "think of the children", "imagine if it were your family"
    /\b(?:think of (?:the|your|our) (?:children|kids|family|loved ones|future)|imagine if (?:it were|this were|that were|this was) (?:your|our|their) (?:child|kid|family|mother|father|son|daughter))\b/gi,

    // Hasty generalization: single example → universal conclusion
    /\b(?:I (?:once|personally) (?:met|saw|knew|heard of))[^.!?\n]{0,40}\b(?:and (?:that|this) (?:proves?|shows?|tells? you|is why)|so (?:all|every|none|no))\b/gi,

    // Circular reasoning: restating the claim as evidence
    /\b(?:it(?:'s| is) (?:true|right|correct|obvious) because)[^.!?\n]{0,30}\b(?:it(?:'s| is) (?:true|right|correct|obvious|the truth|a fact)|that(?:'s| is) (?:just|simply) (?:how it is|the way it is|a fact|the truth|reality))\b/gi,

    // Moral licensing: "I'm not X, but..." structures
    /\b(?:I(?:'m| am) not (?:racist|sexist|bigoted|prejudiced|homophobic|transphobic|xenophobic|against|saying),? but)\b/gi,

    // Loaded framing: pre-judging with adjective before subject
    /\b(?:the (?:so[- ]called|failed|embattled|disgraced|controversial|beleaguered|troubled|scandal[- ]plagued|crisis[- ]hit|under[- ]fire|corrupt|crooked|radical|extremist|far[- ](?:left|right))) (?:president|leader|governor|senator|rep(?:resentative)?|official|minister|politician|administration|government|policy|program|plan|party|movement|organization|group)\b/gi,

    // Reverse psychology / dare manipulation: "I dare you to", "bet you can't", "prove me wrong"
    /\b(?:I (?:dare|challenge|bet) (?:you|anyone)|bet you (?:can'?t|won'?t|don'?t)|prove me wrong|change my mind)\b/gi,

    // Information asymmetry claim: "insiders know", "leaked documents"
    /\b(?:insider(?:s|'s)? (?:know|reveal|say|confirm|report|leaked)|leaked (?:documents?|emails?|memo|footage|recording|data|files?)|behind closed doors|off the record|my source(?:s| inside))\b/gi,

    // Fake balance / enlightened centrism: "both sides have a point" used to equate unequal positions
    /\b(?:both sides (?:have|make) (?:a |some )?(?:good |valid )?points?|the truth (?:is|lies) somewhere in (?:the |between)|I'?m (?:not (?:left|right)|a centrist|moderate) but)\b[^.!?\n]{0,30}\b(?:you have to admit|can'?t deny|let'?s be honest|we (?:all|must)|the (?:real|actual))\b/gi,

    // Poisoning the well: discrediting source before they speak
    /\b(?:before you (?:listen to|believe|trust)|don'?t (?:listen to|believe|trust|be fooled by)|keep in mind (?:that )?(?:he|she|they|this person))[^.!?\n]{0,30}\b(?:is (?:a |known |actually )|has (?:a )?(?:history|track record|been)|was (?:caught|fired|arrested|accused))\b/gi,

    // Performative outrage: exaggerated emotional display for effect
    /\b(?:I (?:literally |actually )?(?:cannot|can'?t) (?:even|believe|stop|breathe)|I am (?:literally |actually )?(?:shaking|trembling|crying|speechless|sick)|(?:this|that|it) (?:literally |actually )?(?:makes me (?:sick|want to|physically)|keeps me (?:up|awake)(?:at night)?))\b/gi,

    // Catastrophic metaphor: using violence/war/disease metaphors for mundane events
    /\b(?:(?:wage|wages?|waging) (?:war|battle|assault) (?:on|against))\b[^.!?\n]{0,20}\b(?:families?|parents?|children|kids|freedom|liberty|values?|traditions?|way of life|faith|religion|speech)\b/gi,
    /\b(?:(?:an? |the )?(?:war|assault|attack|battle|crusade|jihad) (?:on|against) (?:the )?(?:family|families|children|kids|freedom|liberty|values?|Christmas|Easter|faith|Christianity|religion|free speech|our way of life|tradition|common sense|decency|morality|innocence|truth))\b/gi,

    // Deepfake/AI manipulation warnings used as manipulation tools
    /\b(?:don'?t (?:believe|trust) (?:any|what you|anything you) (?:see|hear|read))\b[^.!?\n]{0,20}\b(?:anymore|these days|today|in (?:the|this) (?:media|news|age)|online)\b/gi,

    // Absolute moral authority claim: "as someone who has X, I KNOW"
    /\b(?:as someone who (?:has|lost|suffered|survived|experienced|lived through|fought in|served))\b[^.!?\n]{0,30}\b(?:I (?:can tell you|know|have every right|am qualified|have earned|have authority))\b/gi,
  ]
};

// Neutral/factual indicators - phrases that signal objective reporting
const NEUTRAL_INDICATORS = [
  // Attribution phrases
  'according to', 'as reported by', 'sources say', 'sources said',
  'officials say', 'officials said', 'spokesperson said', 'spokesperson says',
  'representative said', 'representative says', 'statement said', 'statement says',
  'press release', 'news release', 'announced that', 'announced today',
  'reported that', 'reports that', 'reporting that', 'stated that',
  'confirmed that', 'confirms that', 'acknowledged', 'disclosed',
  // Research/data language
  'research shows', 'research indicates', 'research suggests', 'research found',
  'study shows', 'study finds', 'study found', 'study suggests', 'study indicates',
  'studies show', 'studies suggest', 'studies indicate', 'studies found',
  'data indicates', 'data shows', 'data suggests', 'data reveals',
  'evidence shows', 'evidence suggests', 'evidence indicates',
  'analysis shows', 'analysis suggests', 'analysis indicates', 'analysis found',
  'findings show', 'findings suggest', 'findings indicate',
  // Statistics/numbers
  'percent', 'percentage', 'statistics', 'statistical', 'statistically',
  'survey shows', 'survey finds', 'survey found', 'poll shows', 'poll finds',
  'poll found', 'census data', 'census shows', 'report shows', 'report finds',
  'measured', 'measurement', 'calculated', 'calculation', 'estimated',
  // Balanced/nuanced language
  'on the other hand', 'on one hand', 'conversely', 'alternatively',
  'however', 'although', 'while', 'whereas', 'despite', 'nevertheless',
  'nonetheless', 'notwithstanding', 'in contrast', 'by contrast',
  'some argue', 'others argue', 'critics say', 'supporters say',
  'proponents argue', 'opponents argue', 'advocates say', 'skeptics say',
  'both sides', 'different perspectives', 'varying opinions', 'mixed reactions',
  // Expert attribution
  'experts say', 'experts believe', 'experts suggest', 'experts warn',
  'analysts say', 'analysts believe', 'analysts predict', 'analysts expect',
  'researchers say', 'researchers found', 'researchers believe',
  'scientists say', 'scientists found', 'scientists believe',
  'economists say', 'economists predict', 'economists expect',
  'historians say', 'historians note', 'historians point out',
  'professor', 'professor said', 'professor noted', 'professor explained',
  'university', 'university study', 'university research', 'academic',
  // Process/methodology
  'methodology', 'method', 'approach', 'procedure', 'process',
  'peer-reviewed', 'peer review', 'published in', 'journal',
  'clinical trial', 'controlled study', 'meta-analysis', 'systematic review',
  // Temporal/conditional
  'currently', 'at present', 'at this time', 'as of', 'to date',
  'preliminary', 'initial', 'ongoing', 'developing', 'emerging',
  'pending', 'awaiting', 'expected to', 'anticipated', 'projected',
  // Hedging language (indicates careful reporting)
  'appears to', 'seems to', 'may be', 'might be', 'could be',
  'potentially', 'possibly', 'likely', 'unlikely', 'probable', 'improbable',
  'it is unclear', 'remains to be seen', 'time will tell',
  // Factual framing
  'the facts', 'the data', 'the evidence', 'the record shows',
  'documents show', 'documents reveal', 'records show', 'records indicate',
  'court documents', 'court records', 'public records', 'official records',
  // Verification language
  'verified', 'confirmed', 'corroborated', 'authenticated', 'validated',
  'fact-checked', 'fact check', 'independently verified', 'cross-referenced',
  // Institutional/procedural language
  'committee', 'commission', 'council', 'board', 'panel',
  'regulatory', 'regulation', 'legislation', 'legislative',
  'amendment', 'provision', 'clause', 'statute', 'ordinance',
  'resolution', 'motion', 'vote', 'voted', 'unanimous', 'bipartisan',
  'hearing', 'testimony', 'subpoena', 'filing', 'briefing',
  // Scientific language
  'hypothesis', 'theory', 'observation', 'experiment', 'variable',
  'correlation', 'causation', 'sample size', 'confidence interval',
  'standard deviation', 'margin of error', 'control group',
  'double-blind', 'randomized', 'placebo', 'replication',
  // Journalistic standards
  'sources say', 'sources told', 'sources confirmed',
  'on condition of anonymity', 'declined to comment',
  'could not be reached', 'did not respond', 'no comment',
  'retraction', 'correction', 'clarification', 'editor\'s note',
  'update', 'updated', 'developing story',
  // Legal/judicial language
  'plaintiff', 'defendant', 'prosecution', 'defense', 'verdict',
  'ruling', 'ruled', 'judgment', 'adjudicate', 'jurisdiction',
  'statute of limitations', 'precedent', 'appellate', 'appeal',
  'due process', 'habeas corpus', 'injunction', 'restraining order',
  // Government/bureaucratic
  'budget', 'appropriations', 'allocation', 'expenditure',
  'fiscal year', 'quarterly report', 'annual report',
  'memorandum', 'directive', 'executive order', 'proclamation',
  'ratified', 'enacted', 'promulgated', 'codified',
  // Diplomatic/international relations
  'bilateral', 'multilateral', 'diplomatic', 'ambassador',
  'treaty', 'accord', 'agreement', 'protocol', 'convention',
  'sanctions', 'embargo', 'negotiations', 'summit',
  // Academic/educational
  'peer-reviewed', 'systematic review', 'literature review',
  'abstract', 'methodology', 'findings', 'conclusion', 'discussion',
  'reference', 'citation', 'bibliography', 'appendix',
  'interdisciplinary', 'multidisciplinary', 'longitudinal',
  // Infrastructure/technical
  'infrastructure', 'implementation', 'deployment', 'rollout',
  'specification', 'specifications', 'compliance', 'protocol',
  'benchmark', 'baseline', 'metrics', 'kpi', 'deliverable'
];

// Commercial/retail context indicators - when present, reduce manipulation sensitivity
// These indicate marketing content rather than news manipulation
const COMMERCIAL_INDICATORS = [
  // Shopping/retail
  'add to cart', 'add to bag', 'buy now', 'shop now', 'order now',
  'free shipping', 'free delivery', 'fast shipping', 'same day delivery',
  'in stock', 'out of stock', 'limited stock', 'while supplies last',
  'sale', 'clearance', 'discount', 'save', 'savings', 'deal', 'deals',
  'price', 'prices', 'pricing', 'cost', 'affordable', 'budget',
  'checkout', 'check out', 'cart', 'basket', 'wishlist',
  'product', 'products', 'item', 'items', 'sku', 'inventory',
  // Payment/transaction
  'payment', 'pay', 'credit card', 'debit card', 'paypal', 'financing',
  'installments', 'layaway', 'refund', 'return', 'returns', 'exchange',
  'warranty', 'guarantee', 'money back',
  // Customer service
  'customer service', 'support', 'help center', 'contact us', 'faq',
  'track order', 'order status', 'delivery status',
  // E-commerce categories
  'categories', 'departments', 'browse', 'shop by', 'filter by',
  'size', 'color', 'brand', 'brands', 'rating', 'reviews',
  // Job/recruitment sites
  'apply now', 'job', 'jobs', 'career', 'careers', 'hiring', 'resume',
  'salary', 'benefits', 'remote work', 'full time', 'part time',
  'employer', 'employee', 'recruiter', 'recruiting',
  // Sports sites (use urgency language but not manipulative)
  'scores', 'schedule', 'standings', 'stats', 'roster', 'tickets',
  'playoffs', 'championship', 'season', 'game', 'games', 'match',
  'player', 'players', 'team', 'teams', 'league', 'division',
  'nfl', 'nba', 'nhl', 'mlb', 'mls', 'ncaa', 'espn', 'fantasy',
  'highlights', 'recap', 'preview', 'odds', 'betting', 'sportsbook',
  // Religious/spiritual sites (may have emotional language)
  'prayer', 'prayers', 'sermon', 'sermons', 'worship', 'scripture',
  'bible', 'faith', 'church', 'congregation', 'ministry', 'spiritual',
  'devotional', 'meditation', 'blessing', 'blessings',
  // Local news indicators (legitimate journalism)
  'local news', 'weather', 'forecast', 'traffic', 'obituaries',
  'classifieds', 'real estate', 'editorial', 'opinion', 'letters to',
  'subscribe', 'subscription', 'newsletter', 'e-edition', 'print edition',
  // Tech/SaaS commercial patterns
  'sign up', 'sign in', 'log in', 'create account', 'get started',
  'free trial', 'free plan', 'premium', 'enterprise', 'pro plan',
  'upgrade', 'downgrade', 'pricing', 'plans', 'features',
  'integration', 'integrations', 'api', 'documentation', 'docs',
  'dashboard', 'analytics', 'metrics', 'settings', 'preferences',
  // Recipe/cooking sites
  'ingredients', 'servings', 'prep time', 'cook time', 'calories',
  'nutrition', 'recipe', 'recipes', 'tablespoon', 'teaspoon', 'cups',
  // Travel sites
  'book now', 'check availability', 'check in', 'check out',
  'hotel', 'hotels', 'flights', 'flight', 'booking', 'reservation',
  'itinerary', 'destination', 'destinations', 'travel guide',
  // Education sites
  'course', 'courses', 'lesson', 'lessons', 'module', 'modules',
  'curriculum', 'syllabus', 'enrollment', 'enroll', 'certificate',
  'quiz', 'exam', 'assignment', 'homework', 'grade', 'grades',
  // Social media platforms (legitimate community context)
  'followers', 'following', 'posts', 'tweet', 'tweets',
  'thread', 'threads', 'subreddit', 'upvote', 'downvote',
  'profile', 'bio', 'timeline', 'feed', 'notifications',
  'direct message', 'dm', 'mention', 'hashtag', 'trending',
  // Health/medical information (legitimate medical context)
  'symptoms', 'diagnosis', 'treatment', 'medication', 'dosage',
  'side effects', 'clinical', 'patient', 'patients', 'physician',
  'therapy', 'therapeutic', 'prognosis', 'condition', 'disorder',
  // Financial/banking (legitimate financial context)
  'account balance', 'interest rate', 'mortgage', 'loan', 'loans',
  'investment', 'investments', 'portfolio', 'stock', 'stocks',
  'dividend', 'quarterly', 'fiscal', 'revenue', 'earnings',
  'annual report', 'balance sheet', 'income statement',
  // Real estate (legitimate property context)
  'square feet', 'sq ft', 'bedroom', 'bedrooms', 'bathroom', 'bathrooms',
  'listing', 'listings', 'property', 'properties', 'mortgage rate',
  'open house', 'for sale', 'for rent', 'tenant', 'landlord',
  // Automotive (legitimate vehicle context)
  'mpg', 'horsepower', 'torque', 'mileage', 'transmission',
  'sedan', 'suv', 'truck', 'hybrid', 'electric vehicle', 'ev',
  'test drive', 'dealership', 'msrp', 'warranty coverage',
  // Gaming/entertainment
  'gameplay', 'multiplayer', 'co-op', 'single player',
  'dlc', 'expansion pack', 'patch notes', 'update notes',
  'level', 'quest', 'achievement', 'leaderboard', 'ranking'
];

const ESCAPE_REGEX = /[.*+?^${}()|[\]\\]/g;

function escapeRegExp(value) {
  return value.replace(ESCAPE_REGEX, '\\$&');
}

function compileWordPatterns(words, flags) {
  return words.map(word => new RegExp(`\\b${escapeRegExp(word)}\\b`, flags));
}

function countRegexMatches(text, regex) {
  let count = 0;
  regex.lastIndex = 0;
  while (regex.exec(text)) {
    count += 1;
  }
  return count;
}

const COMPILED_POSITIVE = {
  strong: compileWordPatterns(POSITIVE_WORDS.strong, 'gi'),
  moderate: compileWordPatterns(POSITIVE_WORDS.moderate, 'gi'),
  mild: compileWordPatterns(POSITIVE_WORDS.mild, 'gi')
};

const COMPILED_NEGATIVE = {
  strong: compileWordPatterns(NEGATIVE_WORDS.strong, 'gi'),
  moderate: compileWordPatterns(NEGATIVE_WORDS.moderate, 'gi'),
  mild: compileWordPatterns(NEGATIVE_WORDS.mild, 'gi')
};

const COMPILED_MANIPULATION = Object.entries(MANIPULATION_PATTERNS).reduce((acc, [category, patterns]) => {
  const flags = category === 'allCaps' ? 'g' : 'gi';
  acc[category] = compileWordPatterns(patterns, flags);
  return acc;
}, {});

const COMPILED_NEUTRAL = compileWordPatterns(NEUTRAL_INDICATORS, 'gi');
const COMPILED_COMMERCIAL = compileWordPatterns(COMMERCIAL_INDICATORS, 'gi');

const COMPILED_TONE_SIGNALS = {
  negative: Object.entries(NEGATIVE_TONE_SIGNALS).reduce((acc, [category, words]) => {
    acc[category] = compileWordPatterns(words, 'gi');
    return acc;
  }, {}),
  positive: Object.entries(POSITIVE_TONE_SIGNALS).reduce((acc, [category, words]) => {
    acc[category] = compileWordPatterns(words, 'gi');
    return acc;
  }, {})
};

/**
 * Detect if text is primarily commercial/retail content
 * @param {string} text - Lowercase text
 * @returns {boolean}
 */
function isCommercialContent(text) {
  let commercialMatches = 0;
  for (const regex of COMPILED_COMMERCIAL) {
    commercialMatches += countRegexMatches(text, regex);
    if (commercialMatches >= 3) {
      return true;
    }
  }
  // If 3+ commercial indicators, consider it commercial content
  return commercialMatches >= 3;
}

/**
 * Normalize expanded verb forms to contractions so structural patterns
 * using 'don\'t', 'won\'t', 'can\'t', etc. also match "do not", "will not", etc.
 * Applied to lowercased text before pattern matching.
 * @param {string} text - Lowercased text
 * @returns {string}
 */
function normalizeContractions(text) {
  return text
    // Pronoun + verb FIRST (before negation replacements consume "are", "is", etc.)
    .replace(/\bthey are\b/g, "they're")
    .replace(/\byou are\b/g, "you're")
    .replace(/\bwe are\b/g, "we're")
    .replace(/\bi am\b/g, "i'm")
    .replace(/\bit is\b/g, "it's")
    .replace(/\bthat is\b/g, "that's")
    .replace(/\bwhat is\b/g, "what's")
    // Negations SECOND
    .replace(/\bdo not\b/g, "don't")
    .replace(/\bwill not\b/g, "won't")
    .replace(/\bcan ?not\b/g, "can't")
    .replace(/\bdoes not\b/g, "doesn't")
    .replace(/\bis not\b/g, "isn't")
    .replace(/\bare not\b/g, "aren't")
    .replace(/\bwas not\b/g, "wasn't")
    .replace(/\bwere not\b/g, "weren't")
    .replace(/\bdid not\b/g, "didn't")
    .replace(/\bhas not\b/g, "hasn't")
    .replace(/\bhave not\b/g, "haven't")
    .replace(/\bwould not\b/g, "wouldn't")
    .replace(/\bshould not\b/g, "shouldn't")
    .replace(/\bcould not\b/g, "couldn't");
}

/**
 * Count word matches in text
 * @param {string} text - Lowercase text to analyze
 * @param {string[]} words - Words to match
 * @param {number} prominenceWeight - Optional prominence weight multiplier (default 1.0)
 * @returns {number}
 */
function countMatches(text, words, prominenceWeight = 1.0) {
  let count = 0;
  for (const pattern of words) {
    const regex = pattern instanceof RegExp
      ? pattern
      : new RegExp(`\\b${escapeRegExp(pattern)}\\b`, 'gi');
    count += countRegexMatches(text, regex) * prominenceWeight;
  }
  return count;
}

/**
 * Count matches AND collect matched words for transparency/detail views
 * @param {string} text - Lowercased text to check
 * @param {(RegExp|string)[]} words - Compiled patterns or word strings
 * @param {number} prominenceWeight - Optional prominence weight multiplier (default 1.0)
 * @returns {{ count: number, matches: string[] }}
 */
function countMatchesWithDetails(text, words, prominenceWeight = 1.0) {
  let count = 0;
  const matches = [];
  for (const pattern of words) {
    const regex = pattern instanceof RegExp
      ? pattern
      : new RegExp(`\\b${escapeRegExp(pattern)}\\b`, 'gi');
    const found = text.match(regex);
    if (found) {
      count += found.length * prominenceWeight;
      for (const m of found) {
        const word = m.toLowerCase().trim();
        if (word && !matches.includes(word)) {
          matches.push(word);
        }
      }
    }
  }
  return { count, matches };
}

/**
 * Count word matches in text (case-sensitive, for ALL CAPS detection)
 * @param {string} text - Original text to analyze (not lowercased)
 * @param {string[]} words - Words to match (in uppercase)
 * @param {number} prominenceWeight - Optional prominence weight multiplier (default 1.0)
 * @returns {number}
 */
function countMatchesCaseSensitive(text, words, prominenceWeight = 1.0) {
  let count = 0;
  for (const pattern of words) {
    const regex = pattern instanceof RegExp
      ? pattern
      : new RegExp(`\\b${escapeRegExp(pattern)}\\b`, 'g');
    count += countRegexMatches(text, regex) * prominenceWeight;
  }
  return count;
}

/**
 * Calculate sentiment scores from segments with prominence weighting
 * @param {Object[]} segments - Array of {text, weight, wordCount} segments
 * @returns {Object}
 */
function calculateSegmentScores(segments) {
  let positiveScore = 0;
  let negativeScore = 0;
  let manipulationScore = 0;
  let neutralScore = 0;
  let totalWords = 0;
  let totalWeightedWords = 0;
  
  for (const segment of segments) {
    const lowerText = normalizeContractions(segment.text.toLowerCase());
    const weight = segment.weight || 1.0;
    
    totalWords += segment.wordCount || lowerText.split(/\s+/).length;
    totalWeightedWords += (segment.wordCount || lowerText.split(/\s+/).length) * weight;
    
    // Count positive words (weighted by intensity AND prominence)
    positiveScore += 
      countMatches(lowerText, COMPILED_POSITIVE.strong, weight) * INTENSITY_MULTIPLIERS.strong +
      countMatches(lowerText, COMPILED_POSITIVE.moderate, weight) * INTENSITY_MULTIPLIERS.moderate +
      countMatches(lowerText, COMPILED_POSITIVE.mild, weight) * INTENSITY_MULTIPLIERS.mild;
    
    // Count negative words (weighted by intensity AND prominence)
    negativeScore += 
      countMatches(lowerText, COMPILED_NEGATIVE.strong, weight) * INTENSITY_MULTIPLIERS.strong +
      countMatches(lowerText, COMPILED_NEGATIVE.moderate, weight) * INTENSITY_MULTIPLIERS.moderate +
      countMatches(lowerText, COMPILED_NEGATIVE.mild, weight) * INTENSITY_MULTIPLIERS.mild;
    
    // Count manipulation patterns (weighted by prominence)
    // Cap manipulation weight to prevent one headline phrase from dominating.
    // Headlines still count 2x body text, but not 5x — this avoids false
    // positives where a single legitimate-context phrase (e.g. "what you need
    // to know" on BBC) gets amplified by headline prominence weight.
    const manipWeight = Math.min(weight, 2.0);
    // Handle allCaps separately with case-sensitive matching
    for (const [category, patterns] of Object.entries(COMPILED_MANIPULATION)) {
      if (category === 'allCaps') {
        // Match ALL CAPS patterns against original text (case-sensitive)
        manipulationScore += countMatchesCaseSensitive(segment.text, patterns, manipWeight) * 2;
      } else {
        // Match other patterns case-insensitively against lowercased text
        manipulationScore += countMatches(lowerText, patterns, manipWeight) * 2;
      }
    }
    
    // Count structural manipulation patterns (regex-based technique detection)
    // These detect timeless manipulation structures regardless of specific vocabulary
    for (const [category, patterns] of Object.entries(STRUCTURAL_PATTERNS)) {
      manipulationScore += countMatches(lowerText, patterns, manipWeight) * 2;
    }
    
    // Co-occurrence amplifier: when multiple manipulation categories fire on the
    // same segment, it's much more likely to be genuinely manipulative content.
    // A single category match could be accidental; 3+ categories firing together
    // is a strong signal of intentional manipulation.
    {
      let categoriesHit = 0;
      for (const [category, patterns] of Object.entries(COMPILED_MANIPULATION)) {
        const hasMatch = category === 'allCaps'
          ? patterns.some(p => { p.lastIndex = 0; return p.test(segment.text); })
          : patterns.some(p => { p.lastIndex = 0; return p.test(lowerText); });
        if (hasMatch) categoriesHit++;
      }
      for (const [, patterns] of Object.entries(STRUCTURAL_PATTERNS)) {
        const hasMatch = patterns.some(p => { p.lastIndex = 0; return p.test(lowerText); });
        if (hasMatch) categoriesHit++;
      }
      // Amplify when 3+ distinct categories co-occur in one segment
      // This is a relatively small bonus (0.5 per extra category beyond 2)
      // to avoid over-weighting, but it helps identify convergent manipulation
      if (categoriesHit >= 3) {
        manipulationScore += (categoriesHit - 2) * 0.5 * manipWeight;
      }
    }
    
    // Detect tabloid-style sensationalism markers (only in headlines with weight >= 3.0)
    // This prevents false positives from regular content
    if (weight >= 3.0) {
      // Exclamation marks in headlines are a strong indicator of sensational content
      // Cap at 3 per segment to prevent sports/entertainment pages from spiking
      // Also use capped manipWeight for scoring
      const exclamationCount = Math.min(3, (segment.text.match(/!/g) || []).length);
      if (exclamationCount > 0) {
        manipulationScore += exclamationCount * manipWeight * 1.5;
      }
      
      // Note: Generic ALL CAPS word detection was removed because it produced
      // massive false positives on sports sites (team names, city names, player
      // names in ALL CAPS). The specific allCaps manipulation patterns
      // (SHOCKING, BOMBSHELL, EXPOSED, etc.) are already scored above via
      // COMPILED_MANIPULATION.allCaps — that targeted approach is sufficient.
      
      // Clickbait question patterns (e.g., "Is this...?", "What happens...?")
      // Cap at 2 per segment, use capped manipWeight
      const clickbaitQuestions = Math.min(2, (segment.text.match(/\?/g) || []).length);
      if (clickbaitQuestions > 0) {
        manipulationScore += clickbaitQuestions * manipWeight * 0.5;
      }
    }
    
    // Count neutral indicators (weighted by prominence)
    neutralScore += countMatches(lowerText, COMPILED_NEUTRAL, weight) * 2;
  }
  
  // ── Document-level manipulation meta-signals ──
  // These analyze patterns across the ENTIRE text that per-word matching can't catch.
  // They provide a small but meaningful boost when manipulation signals converge.
  {
    const fullText = segments.map(s => s.text).join(' ');
    const fullLower = normalizeContractions(fullText.toLowerCase());
    const fullWords = fullLower.split(/\s+/).length;
    
    if (fullWords >= 20) {
      // 1. Second-person pressure ratio: heavy "you/your" usage signals direct manipulation
      // Threshold: >8% of words (typical articles are 2-4%)
      const youCount = (fullLower.match(/\byou(?:r|rs|rself|rselves)?\b/g) || []).length;
      const youRatio = youCount / fullWords;
      if (youRatio > 0.08) {
        manipulationScore += Math.min(3, (youRatio - 0.08) * 50);
      }
      
      // 2. Exclamation density in body text: >2 per 100 words signals emotional writing
      // This is separate from the headline-level detection above
      const exclamationDensity = (fullText.match(/!/g) || []).length / fullWords * 100;
      if (exclamationDensity > 2.0) {
        manipulationScore += Math.min(3, (exclamationDensity - 2.0) * 0.5);
      }
      
      // 3. Vague attribution: "experts say", "studies show", "research proves"
      // WITHOUT specific names/institutions — a hallmark of manipulation
      const vagueAttributions = (fullLower.match(/\b(?:experts?|scientists?|doctors?|researchers?|studies|research|data|evidence|reports?) (?:say|says?|show|shows?|prove|proves?|confirm|confirms?|reveal|reveals?|suggest|suggests?|indicate|indicates?|demonstrate|demonstrates?)\b/g) || []).length;
      if (vagueAttributions >= 3) {
        manipulationScore += Math.min(3, (vagueAttributions - 2) * 0.8);
      }
      
      // 4. Rhetorical question density: >3 per 200 words signals manipulation
      const questionCount = (fullText.match(/\?/g) || []).length;
      const questionDensity = questionCount / fullWords * 200;
      if (questionDensity > 3.0 && fullWords >= 50) {
        manipulationScore += Math.min(3, (questionDensity - 3.0) * 0.4);
      }
      
      // 5. Emotional escalation pattern: sentences getting progressively more intense
      // Detected by increasing exclamation/caps density in later parts of text
      const halfPoint = Math.floor(fullText.length / 2);
      const firstHalf = fullText.substring(0, halfPoint);
      const secondHalf = fullText.substring(halfPoint);
      const firstIntensity = (firstHalf.match(/[!?]{2,}|[A-Z]{4,}/g) || []).length;
      const secondIntensity = (secondHalf.match(/[!?]{2,}|[A-Z]{4,}/g) || []).length;
      if (secondIntensity > firstIntensity + 2) {
        manipulationScore += Math.min(2, (secondIntensity - firstIntensity - 2) * 0.5);
      }
      
      // 6. Academic/scientific hedging dampener: reduces false positives on scholarly text
      // When a text uses proper academic hedging language, it's less likely to be manipulative
      const hedgingMarkers = (fullLower.match(/\b(?:however|nevertheless|furthermore|moreover|conversely|alternatively|notwithstanding|albeit|whereas|inasmuch|insofar|accordingly|consequently|presumably|arguably|ostensibly|purportedly|hypothetically|theoretically|empirically|statistically|methodologically|longitudinal|meta-analysis|peer[- ]review|randomized|double[- ]blind|placebo[- ]controlled|control group|sample size|confidence interval|standard deviation|p[- ]value|null hypothesis|correlation|regression|variance|coefficient)\b/g) || []).length;
      if (hedgingMarkers >= 4) {
        // Dampen manipulation score: scholarly text with 4+ hedging markers
        // gets 15% reduction per hedging marker beyond 3 (max 60% reduction)
        const dampFactor = Math.max(0.4, 1.0 - (hedgingMarkers - 3) * 0.15);
        manipulationScore *= dampFactor;
      }
      
      // 7. Sentence variety analysis: manipulative text tends to use short, punchy sentences
      // Academic/journalistic text has greater sentence length variety
      const sentences = fullText.split(/[.!?]+/).filter(s => s.trim().length > 0);
      if (sentences.length >= 5) {
        const sentLengths = sentences.map(s => s.trim().split(/\s+/).length);
        const avgLen = sentLengths.reduce((a, b) => a + b, 0) / sentLengths.length;
        const variance = sentLengths.reduce((sum, len) => sum + Math.pow(len - avgLen, 2), 0) / sentLengths.length;
        const shortSentRatio = sentLengths.filter(l => l <= 5).length / sentLengths.length;
        
        // If >60% of sentences are 5 words or fewer AND average is short → likely manipulative
        if (shortSentRatio > 0.6 && avgLen < 8) {
          manipulationScore += Math.min(2, (shortSentRatio - 0.6) * 5);
        }
        
        // High sentence length variance + longer average → scholarly, dampen manipulation
        if (variance > 50 && avgLen > 15) {
          manipulationScore *= 0.9;
        }
      }
    }
  }
  
  // Avoid division by zero
  if (totalWords === 0) {
    return { 
      positive: 0, 
      negative: 0, 
      neutral: 1, 
      manipulation: 0,
      totalWords: 0,
      rawPositive: 0,
      rawNegative: 0,
      rawManipulation: 0
    };
  }
  
  // Store raw scores for signal strength calculation
  const rawPositive = positiveScore;
  const rawNegative = negativeScore;
  const rawManipulation = manipulationScore;
  
  // Normalize by word count (per 100 words)
  const normalizer = 100 / totalWords;
  
  return {
    positive: positiveScore * normalizer,
    negative: negativeScore * normalizer,
    neutral: neutralScore * normalizer,
    manipulation: manipulationScore * normalizer,
    totalWords,
    totalWeightedWords,
    rawPositive,
    rawNegative,
    rawManipulation
  };
}

/**
 * Adjust sentiment classification based on tone signal evidence.
 * When word-level sentiment and tone signals strongly disagree,
 * tone signals can override the direction (e.g. BBC News: word-level
 * says "positive" but tone signals detect 50 negative vs 6 positive →
 * corrects to negative).
 * @param {Object} classification - From classifySentiment()
 * @param {Object} toneSignals - { positive: { cat: {count,matches} }, negative: { cat: {count,matches} } }
 * @returns {Object} - Adjusted classification
 */
function adjustForToneSignals(classification, toneSignals) {
  if (!toneSignals || !toneSignals.positive || !toneSignals.negative) return classification;

  const sumCounts = (obj) => Object.values(obj).reduce((s, v) => s + (typeof v === 'object' ? v.count : (v || 0)), 0);
  const totalPosTone = sumCounts(toneSignals.positive);
  const totalNegTone = sumCounts(toneSignals.negative);
  const totalTone = totalPosTone + totalNegTone;

  // Need minimum evidence to adjust (at least 3 tone signals)
  if (totalTone < 3) return classification;

  const toneBalance = (totalPosTone - totalNegTone) / totalTone; // -1 to +1
  let { sentiment, intensity } = classification;

  const sentimentDir = sentiment === 'positive' ? 1 : sentiment === 'negative' ? -1 : 0;
  const toneDir = toneBalance > 0.1 ? 1 : toneBalance < -0.1 ? -1 : 0;

  if (sentimentDir !== 0 && sentimentDir === toneDir) {
    // Agreement: tone confirms word-level sentiment → mild confidence boost
    const boost = Math.abs(toneBalance) * 0.1;
    intensity = Math.min(1, intensity + boost);
  } else if (sentimentDir !== 0 && toneDir !== 0 && sentimentDir !== toneDir) {
    // Mismatch: tone and word-level disagree
    const mismatchStrength = Math.abs(toneBalance);

    if (mismatchStrength > 0.15 && totalTone >= 5) {
      // Tone signals disagree with word-level sentiment with enough evidence.
      // News sites commonly hit toneBalance ~-0.17 to -0.32 due to AFINN
      // overcounting context-neutral words ("top", "best", "win") as positive.
      // When tone signals clearly lean one way, trust them over word-level.
      sentiment = toneDir > 0 ? 'positive' : 'negative';
      // Scale intensity by how strongly tone signals agree (0.15-1.0 → 10-50%)
      intensity = Math.min(1, mismatchStrength * 0.5);
    } else {
      // Mild disagreement: dampen intensity toward neutral
      intensity = intensity * (1 - mismatchStrength * 0.6);
    }
  } else if (sentimentDir === 0 && toneDir !== 0 && totalTone >= 5 && Math.abs(toneBalance) > 0.15) {
    // Neutral sentiment but clear tone signals: nudge toward tone direction
    sentiment = toneDir > 0 ? 'positive' : 'negative';
    // Use stronger scaling now that more content starts as neutral from the
    // widened neutral classification zone. A balance of -0.3 should yield
    // meaningful negative intensity (~12%).
    intensity = Math.abs(toneBalance) * 0.4;
  }

  return { ...classification, sentiment, intensity };
}

/**
 * Determine overall sentiment classification
 * @param {Object} scores - From calculateSegmentScores
 * @param {boolean} isCommercial - Whether content is commercial/retail
 * @returns {Object}
 */
function classifySentiment(scores, isCommercial = false, sensitivity = 'medium') {
  const { positive, negative, neutral, manipulation, totalWords = 100 } = scores;
  
  // Sensitivity multipliers: affect how easily manipulation is flagged
  // 'low'  = lenient (harder to flag) — fewer false positives
  // 'medium' = default balanced behavior
  // 'high' = strict (easier to flag) — catches more but may over-flag
  const sensitivityConfig = {
    low:    { thresholdMult: 1.5, densityMin: 5, intensityThreshold: 0.95 },
    medium: { thresholdMult: 1.0, densityMin: 3, intensityThreshold: 0.9 },
    high:   { thresholdMult: 0.7, densityMin: 2, intensityThreshold: 0.8 }
  };
  const sensCfg = sensitivityConfig[sensitivity] || sensitivityConfig.medium;
  
  // Calculate net sentiment
  const netSentiment = positive - negative;
  const totalEmotional = positive + negative;
  
  // Determine primary sentiment
  let sentiment;
  let intensity;
  
  if (totalEmotional < 2 && neutral > 1) {
    // Low emotional content + neutral indicators = neutral
    sentiment = 'neutral';
    intensity = 0;
  } else if (Math.abs(netSentiment) < 2) {
    // Weak lean in either direction → neutral
    // Many reference/informational sites score net-positive from
    // contextually neutral words ("help", "free", "easy", "good", "simple")
    // that appear in positive word lists. A net of 1-2 per 100 words
    // is not strong enough evidence for directional classification.
    sentiment = 'neutral';
    intensity = 0;
  } else if (totalEmotional > 4 && Math.abs(netSentiment) / totalEmotional < 0.35) {
    // High emotional content but neither side dominates clearly → neutral
    // When positive and negative signals are both present and roughly balanced,
    // the content discusses both sides (e.g. review sites, mixed news).
    sentiment = 'neutral';
    intensity = 0;
  } else if (netSentiment > 0) {
    sentiment = 'positive';
    // Scale intensity: 0-20 score maps to 0-1 intensity
    intensity = Math.min(1, positive / 15);
  } else {
    sentiment = 'negative';
    // Scale intensity: 0-20 score maps to 0-1 intensity
    intensity = Math.min(1, negative / 15);
  }
  
  // Dampen intensity for very short content with weak signals.
  // Per-100-word normalization exaggerates scores when there are only
  // a handful of words. But if signal density is high (many emotional
  // words per word), trust the classification since the evidence is strong.
  if (totalWords < 100) {
    const signalDensity = totalEmotional / Math.max(1, totalWords / 100);
    // Only damp if signal density is low (< 8 per 100 words)
    // High density means text is genuinely emotionally loaded
    if (signalDensity < 8) {
      const dampFactor = Math.max(0.3, totalWords / 100);
      intensity *= dampFactor;
    }
  }
  
  // PROPORTIONAL manipulation: scale threshold by content size
  // Require evidence of manipulation proportional to content length.
  // Legitimate news may have some emotionally charged language.
  const rawManipulation = scores.rawManipulation || manipulation * (totalWords / 100);
  
  // Base threshold scales with content length: min 3, max 15
  // Commercial content gets higher threshold (marketing uses urgency legitimately)
  // Sensitivity adjusts how high the bar is set
  const baseThreshold = isCommercial ? 5 : 3;
  const manipulationThreshold = Math.max(baseThreshold, Math.min(15, Math.ceil(totalWords / 25))) * sensCfg.thresholdMult;
  
  // Manipulation level: raw count relative to proportional threshold
  const manipulationLevel = Math.min(1, rawManipulation / (manipulationThreshold * 2));
  
  // Mark as manipulative only if:
  // 1. Sufficient content (>= 100 words) for reliable classification
  // 2. NOT commercial content
  // 3. Raw manipulation score meets proportional threshold, AND
  //    Manipulation density exceeds 3 per 100 words (each match = weight*2 points,
  //    so ~1.5 body-text pattern matches per 100 words — fact-checking and
  //    encyclopedia sites that discuss manipulation topics often hit 2-2.5 density
  //    without being manipulative themselves)
  // OR: Very high negative intensity (>0.9) + negative sentiment + some manipulation
  //
  // Note: Commercial detection is NOT used to block manipulation flagging because
  // the commercial indicators match too broadly (subscribe, newsletter, support,
  // opinion, editorial) — nearly every news/media site hits 3+ matches.
  // The proportional threshold already provides sufficient false-positive protection.
  //
  // Real-world calibration (from E2E testing on conspiracy/misinfo homepages):
  //   Conspiracy/misinfo: ~2-4 density (weighted: fear+divisive+emotional × 2)
  //   Legitimate news: ~0.3-1.0 density
  //   Synthetic test text: ~20-30 density
  //   NaturalNews (long-form): 0.95 density but 34 raw — needs absolute threshold
  const hasEnoughContent = totalWords >= 100;
  const isManipulative = hasEnoughContent && (
    (rawManipulation >= manipulationThreshold && manipulation > sensCfg.densityMin) || 
    (intensity > sensCfg.intensityThreshold && sentiment === 'negative' && rawManipulation >= manipulationThreshold * 0.8)
  );
  
  return {
    sentiment,
    intensity,
    manipulation: manipulationLevel,
    isManipulative,
    manipulationThreshold,
    rawManipulation,
    scores: {
      positive,
      negative,
      neutral,
      manipulation
    }
  };
}

/**
 * Calculate confidence based on word count AND signal strength
 * @param {number} wordCount 
 * @param {Object} scores - Contains rawPositive, rawNegative, rawManipulation
 * @returns {string} - 'low', 'medium', or 'high'
 */
function calculateConfidence(wordCount, scores) {
  const { rawPositive = 0, rawNegative = 0, rawManipulation = 0 } = scores;
  
  // Total signal strength (sum of all detected patterns)
  const signalStrength = rawPositive + rawNegative + rawManipulation;
  
  // Signal density: signals per 100 words
  const signalDensity = wordCount > 0 ? (signalStrength / wordCount) * 100 : 0;
  
  // Low word count with weak signals = low confidence
  // Low word count with strong signals = medium confidence
  // High word count with any signals = high confidence
  
  if (wordCount < 10) {
    // Very short: need strong signals to upgrade
    return signalDensity > 20 ? 'medium' : 'low';
  } else if (wordCount < 50) {
    // Short: signals can boost to high
    return signalDensity > 15 ? 'high' : 'medium';
  } else if (wordCount < 150) {
    // Medium: baseline high, but weak signals drop to medium
    return signalDensity < 2 ? 'medium' : 'high';
  } else {
    // Long content: high confidence unless almost no signals
    return signalDensity < 1 ? 'medium' : 'high';
  }
}

/**
 * Analyze segments with prominence weighting
 * Primary analysis function for use with visibleTextExtractor
 * @param {Object} extractedData - Output from extractVisibleText/extractVisibleTextSample
 * @returns {Object}
 */
function analyzeSegments(extractedData, options = {}) {
  // Handle null, undefined, or empty input
  if (!extractedData || !extractedData.segments || extractedData.segments.length === 0) {
    return {
      sentiment: 'neutral',
      intensity: 0,
      manipulation: { fear: 0, divisive: 0, urgency: 0, emotional: 0 },
      isManipulative: false,
      confidence: 'low',
      description: 'No content to analyze',
      wordCount: 0
    };
  }
  
  const sensitivity = options.sensitivity || 'medium';
  const { segments, wordCount: totalWords } = extractedData;
  
  // Check if this is commercial/retail content
  const fullText = (extractedData.text || segments.map(s => s.text).join(' ')).toLowerCase();
  const isCommercial = isCommercialContent(fullText);
  
  // Calculate scores using segment weights
  const scores = calculateSegmentScores(segments);
  const classification = classifySentiment(scores, isCommercial, sensitivity);
  
  // Calculate confidence using word count AND signal strength
  const confidence = calculateConfidence(totalWords, scores);
  
  // Calculate manipulation breakdown by type (weighted by prominence)
  const manipulationBreakdown = {
    fear: 0, fearMatches: [],
    divisive: 0, divisiveMatches: [],
    urgency: 0, urgencyMatches: [],
    emotional: 0, emotionalMatches: []
  };
  // Calculate tone signal breakdown (what kind of emotional words appear)
  const toneSignals = {
    negative: { hostility: { count: 0, matches: [] }, alarm: { count: 0, matches: [] }, distress: { count: 0, matches: [] }, contempt: { count: 0, matches: [] } },
    positive: { admiration: { count: 0, matches: [] }, warmth: { count: 0, matches: [] }, optimism: { count: 0, matches: [] }, celebration: { count: 0, matches: [] } }
  };
  for (const segment of segments) {
    const lowerText = normalizeContractions(segment.text.toLowerCase());
    const weight = segment.weight || 1.0;
    // Manipulation breakdown with matched words
    for (const cat of ['fear', 'divisive', 'urgency', 'emotional']) {
      const result = countMatchesWithDetails(lowerText, COMPILED_MANIPULATION[cat] || [], weight);
      manipulationBreakdown[cat] += result.count;
      const matchKey = cat + 'Matches';
      for (const w of result.matches) {
        if (!manipulationBreakdown[matchKey].includes(w)) manipulationBreakdown[matchKey].push(w);
      }
    }
    // Structural manipulation patterns (same categories, additive)
    for (const cat of ['fear', 'divisive', 'urgency', 'emotional']) {
      if (STRUCTURAL_PATTERNS[cat]) {
        const result = countMatchesWithDetails(lowerText, STRUCTURAL_PATTERNS[cat], weight);
        manipulationBreakdown[cat] += result.count;
        const matchKey = cat + 'Matches';
        for (const w of result.matches) {
          // Truncate long structural matches for display
          const display = w.length > 50 ? w.slice(0, 47) + '...' : w;
          if (!manipulationBreakdown[matchKey].includes(display)) manipulationBreakdown[matchKey].push(display);
        }
      }
    }
    // Negative tone signals
    for (const cat of Object.keys(NEGATIVE_TONE_SIGNALS)) {
      const result = countMatchesWithDetails(lowerText, COMPILED_TONE_SIGNALS.negative[cat] || [], weight);
      toneSignals.negative[cat].count += result.count;
      for (const w of result.matches) {
        if (!toneSignals.negative[cat].matches.includes(w)) toneSignals.negative[cat].matches.push(w);
      }
    }
    // Positive tone signals
    for (const cat of Object.keys(POSITIVE_TONE_SIGNALS)) {
      const result = countMatchesWithDetails(lowerText, COMPILED_TONE_SIGNALS.positive[cat] || [], weight);
      toneSignals.positive[cat].count += result.count;
      for (const w of result.matches) {
        if (!toneSignals.positive[cat].matches.includes(w)) toneSignals.positive[cat].matches.push(w);
      }
    }
  }
  
  // Adjust classification based on tone signal evidence
  const adjusted = adjustForToneSignals(classification, toneSignals);
  
  // Generate description
  const description = generateDescription({ 
    ...adjusted
  });
  
  return {
    sentiment: adjusted.sentiment,
    intensity: adjusted.intensity,
    manipulation: manipulationBreakdown,
    toneSignals,
    isManipulative: adjusted.isManipulative,
    confidence,
    description,
    wordCount: totalWords,
    quotedRatio: extractedData.quotedRatio || 0,
    rawManipulation: adjusted.rawManipulation,
    manipulationThreshold: adjusted.manipulationThreshold,
    manipulationDensity: adjusted.scores?.manipulation
  };
}

/**
 * Analyze text and return complete sentiment analysis
 * Convenience wrapper around analyzeSegments for plain text input.
 * @param {string} text
 * @returns {Object}
 */
function analyzeSentiment(text) {
  // Handle null, undefined, or non-string input
  if (!text || typeof text !== 'string' || text.trim().length === 0) {
    return {
      sentiment: 'neutral',
      intensity: 0,
      manipulation: { fear: 0, divisive: 0, urgency: 0, emotional: 0 },
      toneSignals: {
        negative: { hostility: { count: 0, matches: [] }, alarm: { count: 0, matches: [] }, distress: { count: 0, matches: [] }, contempt: { count: 0, matches: [] } },
        positive: { admiration: { count: 0, matches: [] }, warmth: { count: 0, matches: [] }, optimism: { count: 0, matches: [] }, celebration: { count: 0, matches: [] } }
      },
      isManipulative: false,
      confidence: 'low',
      description: 'No content to analyze'
    };
  }
  
  // Convert plain text to single-segment format for analyzeSegments
  const wordCount = text.split(/\s+/).filter(w => w.length > 0).length;
  const extractedData = {
    segments: [{ text, weight: 1.0 }],
    text,
    wordCount,
    quotedRatio: 0
  };
  
  return analyzeSegments(extractedData);
}

/**
 * Generate human-readable description
 * @param {Object} classification
 * @returns {string}
 */
function generateDescription(classification) {
  const { sentiment, intensity, isManipulative } = classification;
  
  let desc = '';
  
  if (sentiment === 'neutral') {
    desc = 'No manipulation techniques detected';
  } else if (sentiment === 'positive') {
    if (intensity > 0.7) desc = 'Strongly positive content';
    else if (intensity > 0.4) desc = 'Positive content';
    else desc = 'Mildly positive content';
  } else {
    if (intensity > 0.7) desc = 'Strongly negative content';
    else if (intensity > 0.4) desc = 'Negative content';
    else desc = 'Mildly negative content';
  }
  
  if (isManipulative) {
    desc += ' with persuasive language';
  }
  
  return desc;
}

export { 
  analyzeSentiment, 
  analyzeSegments,
  adjustForToneSignals,
  calculateSegmentScores,
  calculateConfidence,
  normalizeContractions,
  POSITIVE_WORDS,
  NEGATIVE_WORDS,
  MANIPULATION_PATTERNS,
  STRUCTURAL_PATTERNS,
  NEUTRAL_INDICATORS,
  INTENSITY_MULTIPLIERS
};
