// server.js - Express server for Reddit simulation with real posts AND real comments

// Load environment variables from .env file
require('dotenv').config();

const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const app = express();
const port = process.env.PORT || 3000;

// Get API key from environment variables
const API_KEY = process.env.CLAUDE_API_KEY;

// Check if API key is loaded
if (!API_KEY) {
    console.error('ERROR: CLAUDE_API_KEY not found in .env file!');
    console.error('Please create a .env file with your API key.');
    process.exit(1);
}

// Enable CORS for all routes
app.use(cors());

// Parse JSON bodies
app.use(express.json());

// Serve static files from public folder
app.use(express.static('public'));

// Global variables for slang data
let slangData = [];
let slangTerms = [];
let slangMeanings = {};

// Global variables for Reddit posts and real comments
let redditPosts = [];
let realComments = {}; // Real Reddit comments loaded from file

let emojiData = [];
let emojiVocabulary = {}; // emoji -> meaning mapping
let emojiCharacters = [];

// Analytics data storage
let analyticsData = {
    comments: [],
    vocabularyStats: {
        normal: { uniqueWords: 0, totalWords: 0, avgLength: 0 },
        constrained: { uniqueWords: 0, totalWords: 0, avgLength: 0 },
        academic: { uniqueWords: 0, totalWords: 0, avgLength: 0 }
    },
    constraintDistribution: { normal: 0, constrained: 0, academic: 0 },
    emojiUsage: [],
    commentLengths: []
};

// Analytics utility functions
function analyzeComment(text, constraintLevel) {
    const words = text.toLowerCase().match(/\b\w+\b/g) || [];
    const uniqueWords = new Set(words);
    const emojiCount = (text.match(/[\u{1F600}-\u{1F64F}]|[\u{1F300}-\u{1F5FF}]|[\u{1F680}-\u{1F6FF}]|[\u{1F1E0}-\u{1F1FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]/gu) || []).length;
    
    return {
        wordCount: words.length,
        uniqueWordCount: uniqueWords.size,
        vocabularyDiversity: words.length > 0 ? uniqueWords.size / words.length : 0,
        emojiCount: emojiCount,
        characterCount: text.length,
        constraintLevel: constraintLevel,
        timestamp: Date.now()
    };
}

function updateAnalytics(commentAnalysis) {
    // Add to comments array
    analyticsData.comments.push(commentAnalysis);
    
    // Update constraint distribution
    analyticsData.constraintDistribution[commentAnalysis.constraintLevel]++;
    
    // Update vocabulary stats
    const constraint = commentAnalysis.constraintLevel;
    const stats = analyticsData.vocabularyStats[constraint];
    const currentCount = analyticsData.constraintDistribution[constraint];
    
    // Running average calculation
    stats.uniqueWords = ((stats.uniqueWords * (currentCount - 1)) + commentAnalysis.uniqueWordCount) / currentCount;
    stats.totalWords = ((stats.totalWords * (currentCount - 1)) + commentAnalysis.wordCount) / currentCount;
    stats.avgLength = ((stats.avgLength * (currentCount - 1)) + commentAnalysis.characterCount) / currentCount;
    
    // Add emoji usage point
    analyticsData.emojiUsage.push({
        timestamp: commentAnalysis.timestamp,
        count: commentAnalysis.emojiCount,
        constraint: constraint
    });
    
    // Add comment length point
    analyticsData.commentLengths.push({
        timestamp: commentAnalysis.timestamp,
        length: commentAnalysis.characterCount,
        constraint: constraint
    });
    
    // Keep only last 50 data points for performance
    if (analyticsData.emojiUsage.length > 50) {
        analyticsData.emojiUsage = analyticsData.emojiUsage.slice(-50);
    }
    if (analyticsData.commentLengths.length > 50) {
        analyticsData.commentLengths = analyticsData.commentLengths.slice(-50);
    }
}

// Function to load slang data from local JSON file
function loadSlangDataset() {
    try {
        console.log('Loading Gen Z slang dataset from local file...');
        
        const slangFilePath = path.join(__dirname, 'slang_data.json');
        
        if (!fs.existsSync(slangFilePath)) {
            console.log('⚠️  slang_data.json not found. Using fallback slang terms...');
            
            // Fallback slang terms
            const fallbackSlang = {
                'tbh': 'to be honest', 'ngl': 'not gonna lie', 'fr': 'for real',
                'lowkey': 'somewhat or secretly', 'highkey': 'obviously or very much',
                'deadass': 'seriously or honestly', 'no cap': 'no lie, for real',
                'periodt': 'period, end of discussion', 'slay': 'to do something really well',
                'bestie': 'best friend', 'queen': 'someone amazing', 'king': 'someone amazing (masculine)',
                'fire': 'awesome or excellent', 'based': 'agreeable or admirable',
                'cringe': 'embarrassing or awkward', 'mid': 'mediocre or average',
                'bussin': 'really good', 'sheesh': 'expression of amazement',
                'vibe': 'feeling or mood', 'mood': 'relatable feeling', 'sus': 'suspicious',
                'flex': 'to show off', 'stan': 'to be a big fan of', 'tea': 'gossip or truth',
                'rizz': 'charisma', 'w': 'win', 'l': 'loss', 'bet': 'agreement'
            };
            
            slangTerms = Object.keys(fallbackSlang);
            slangMeanings = fallbackSlang;
            slangData = Object.entries(fallbackSlang).map(([slang, meaning]) => ({ slang, meaning }));
            
            console.log(`✅ Using ${slangTerms.length} fallback slang terms`);
            return;
        }
        
        // Read the JSON file
        const fileContent = fs.readFileSync(slangFilePath, 'utf8');
        const data = JSON.parse(fileContent);
        
        // Extract the data
        slangTerms = data.terms || [];
        slangMeanings = data.meanings || {};
        slangData = data.full_data || [];
        
        console.log(`✅ Loaded ${slangTerms.length} slang terms from local file`);
        
    } catch (error) {
        console.error('❌ Error loading slang dataset:', error);
        slangTerms = ['tbh', 'ngl', 'fr', 'lowkey', 'deadass', 'no cap'];
        console.log(`⚠️  Using minimal fallback terms`);
    }
}

// Function to load emoji dataset with meanings for rich vocabulary
function loadEmojiDataset() {
    try {
        console.log('Loading emoji dataset with meanings for rich vocabulary...');
        
        const emojiFilePath = path.join(__dirname, 'data/emoji_dataset/full_emoji.csv');
        
        if (!fs.existsSync(emojiFilePath)) {
            console.log('⚠️  Emoji dataset not found. Using fallback emoji vocabulary...');
            
            // Rich fallback emoji vocabulary with meanings
            emojiVocabulary = {
                '😀': 'happy, grinning, joy',
                '😂': 'laughing, funny, hilarious',
                '🤔': 'thinking, pondering, considering',
                '😍': 'love, adoration, heart-eyes',
                '😢': 'sad, crying, upset',
                '😡': 'angry, mad, furious',
                '🔥': 'fire, hot, amazing, lit',
                '💯': 'perfect, 100%, completely agree',
                '✨': 'sparkles, magic, special',
                '🌟': 'star, excellent, outstanding',
                '💭': 'thought bubble, thinking, ideas',
                '💡': 'lightbulb, idea, innovation',
                '🎯': 'target, goal, accurate, spot on',
                '🚀': 'rocket, fast, launch, progress',
                '⚡': 'lightning, energy, power, quick',
                '🌈': 'rainbow, diversity, hope, colorful',
                '🎉': 'celebration, party, success',
                '👍': 'thumbs up, good, approve',
                '👎': 'thumbs down, bad, disapprove',
                '🤝': 'handshake, agreement, cooperation',
                '🙏': 'prayer, please, gratitude, hope',
                '💪': 'strong, power, strength',
                '🧠': 'brain, intelligence, thinking',
                '👀': 'eyes, looking, watching, attention',
                '🗣️': 'speaking, talking, communication',
                '👂': 'listening, hearing, attention',
                '❤️': 'heart, love, care',
                '💔': 'broken heart, sadness, loss',
                '🌍': 'earth, world, global, environment',
                '⏰': 'time, clock, deadline, urgent'
            };
            
            emojiCharacters = Object.keys(emojiVocabulary);
            console.log(`✅ Using ${emojiCharacters.length} fallback emojis with meanings`);
            return;
        }
        
        // Read and parse the CSV file
        const fileContent = fs.readFileSync(emojiFilePath, 'utf8');
        const lines = fileContent.split('\n');
        const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
        
        console.log('CSV headers:', headers);
        
        // Find relevant columns
        let emojiColumnIndex = -1;
        let nameColumnIndex = -1;
        let descriptionColumnIndex = -1;
        
        for (let i = 0; i < headers.length; i++) {
            const header = headers[i].replace(/"/g, '');
            if (header.includes('emoji') || header.includes('character')) {
                emojiColumnIndex = i;
            } else if (header.includes('name') || header.includes('title')) {
                nameColumnIndex = i;
            } else if (header.includes('description') || header.includes('meaning') || header.includes('keywords')) {
                descriptionColumnIndex = i;
            }
        }
        
        console.log(`Found columns - Emoji: ${emojiColumnIndex}, Name: ${nameColumnIndex}, Description: ${descriptionColumnIndex}`);
        
        // Extract emoji vocabulary from the CSV
        const extractedVocabulary = {};
        for (let i = 1; i < lines.length && i < 2000; i++) { // Process up to 2000 emojis
            const columns = lines[i].split(',');
            
            if (columns[emojiColumnIndex]) {
                const emojiChar = columns[emojiColumnIndex].trim().replace(/"/g, '');
                
                // Check if it's actually an emoji
                if (emojiChar && /[\u{1F600}-\u{1F64F}]|[\u{1F300}-\u{1F5FF}]|[\u{1F680}-\u{1F6FF}]|[\u{1F1E0}-\u{1F1FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]/u.test(emojiChar)) {
                    
                    // Build meaning from available columns
                    let meaning = '';
                    if (nameColumnIndex !== -1 && columns[nameColumnIndex]) {
                        meaning += columns[nameColumnIndex].trim().replace(/"/g, '');
                    }
                    if (descriptionColumnIndex !== -1 && columns[descriptionColumnIndex]) {
                        const desc = columns[descriptionColumnIndex].trim().replace(/"/g, '');
                        meaning += meaning ? `, ${desc}` : desc;
                    }
                    
                    if (meaning) {
                        extractedVocabulary[emojiChar] = meaning;
                    }
                }
            }
        }
        
        emojiVocabulary = extractedVocabulary;
        emojiCharacters = Object.keys(emojiVocabulary);
        
        console.log(`✅ Loaded ${emojiCharacters.length} emojis with meanings from dataset`);
        console.log('Sample emoji vocabulary:');
        Object.entries(emojiVocabulary).slice(0, 10).forEach(([emoji, meaning]) => {
            console.log(`  ${emoji}: ${meaning}`);
        });
        
    } catch (error) {
        console.error('❌ Error loading emoji dataset:', error);
        console.log('⚠️  Using minimal fallback emoji vocabulary');
        emojiVocabulary = {
            '😀': 'happy, joy', '😂': 'funny, laughing', '🤔': 'thinking', 
            '😍': 'love', '😢': 'sad', '😡': 'angry', '🔥': 'amazing', '💯': 'perfect'
        };
        emojiCharacters = Object.keys(emojiVocabulary);
    }
}

// Function to load Reddit posts and real comments from local JSON file
function loadRedditPostsAndComments() {
    try {
        console.log('Loading real Reddit posts and comments from local file...');
        
        const postsFilePath = path.join(__dirname, 'reddit_posts.json');
        
        if (!fs.existsSync(postsFilePath)) {
            console.log('⚠️  reddit_posts.json not found. Run fetch_reddit_posts.py first!');
            console.log('Using fallback posts...');
            
            // Use fallback posts and comments
            redditPosts = createFallbackPosts();
            realComments = createFallbackComments();
            console.log(`✅ Using ${redditPosts.length} fallback posts with comments`);
            return;
        }
        
        // Read the JSON file
        const fileContent = fs.readFileSync(postsFilePath, 'utf8');
        const data = JSON.parse(fileContent);
        
        // Extract the posts and comments
        redditPosts = data.posts || [];
        realComments = data.comments || {}; // Real Reddit comments!
        
        console.log(`✅ Loaded ${redditPosts.length} real Reddit posts from local file`);
        console.log(`💬 Loaded real comments for ${Object.keys(realComments).length} posts`);
        console.log(`📅 Posts fetched: ${data.fetch_date || 'unknown'}`);
        
        // Show some sample subreddits
        const subreddits = [...new Set(redditPosts.map(p => p.subreddit))];
        console.log(`📍 Subreddits: ${subreddits.slice(0, 8).join(', ')}${subreddits.length > 8 ? '...' : ''}`);
        
    } catch (error) {
        console.error('❌ Error loading Reddit posts and comments:', error);
        console.log('Using fallback posts...');
        redditPosts = createFallbackPosts();
        realComments = createFallbackComments();
        console.log(`⚠️  Using ${redditPosts.length} fallback posts`);
    }
}

// Create fallback posts if file loading fails
function createFallbackPosts() {
    return [
        {
            id: 1,
            subreddit: "science",
            title: "New study reveals that complex language patterns in digital communication may be fundamentally altered by platform constraints, potentially affecting cognitive processing",
            author: "researcher_jane",
            time: "3 hours ago",
            upvotes: 1247,
            comments: 847,
            text: "Researchers at MIT have published findings suggesting that when communication platforms constrain expression through character limits, simplified interfaces, or algorithmic prioritization of certain content types, users gradually adapt their language patterns in ways that may reduce the complexity and nuance of their thoughts...",
            type: "text",
            image: null
        },
        {
            id: 2,
            subreddit: "blurrypicturesofcats",
            title: "My cat achieved maximum blur while zooming past",
            author: "cat_photographer",
            time: "2 hours ago",
            upvotes: 2341,
            comments: 89,
            text: "",
            type: "image",
            image: "https://images.unsplash.com/photo-1514888286974-6c03e2ca1dba?w=600&h=400&fit=crop"
        },
        {
            id: 3,
            subreddit: "dbz",
            title: "Power scaling discussion: Could Goku actually beat Superman in a fair fight?",
            author: "anime_debater",
            time: "6 hours ago",
            upvotes: 756,
            comments: 234,
            text: "After rewatching both series, I think we need to settle this debate with actual feats analysis...",
            type: "text",
            image: null
        },
        {
            id: 4,
            subreddit: "survival",
            title: "Essential gear for 3-day wilderness survival: What you actually need vs what gear companies sell you",
            author: "wilderness_expert",
            time: "4 hours ago",
            upvotes: 892,
            comments: 156,
            text: "After 15 years of survival training, here's what I've learned about the absolute essentials...",
            type: "text",
            image: null
        },
        {
            id: 5,
            subreddit: "onebag",
            title: "One year, one backpack: My minimalist travel setup that works everywhere",
            author: "digital_nomad_life",
            time: "8 hours ago",
            upvotes: 1234,
            comments: 278,
            text: "After traveling to 30 countries with just a 35L backpack, here's my refined packing list...",
            type: "text",
            image: null
        }
    ];
}

// Create fallback comments structure
function createFallbackComments() {
    return {
        1: [
            {
                author: 'research_enthusiast',
                text: 'This is fascinating research. The implications for understanding how digital platforms shape our thinking are enormous.',
                upvotes: 156,
                time: '2 hours ago'
            },
            {
                author: 'skeptical_scientist',
                text: 'While the findings are interesting, I wonder about the methodology. Did they control for age and education levels?',
                upvotes: 89,
                time: '1 hour ago'
            }
        ],
        2: [
            {
                author: 'cat_lover_supreme',
                text: 'This is peak cat photography. The blur adds to the artistic value somehow.',
                upvotes: 67,
                time: '1 hour ago'
            },
            {
                author: 'photography_critic',
                text: 'Technically not great but emotionally perfect. Captures the essence of cat energy.',
                upvotes: 23,
                time: '45 minutes ago'
            }
        ],
        3: [
            {
                author: 'power_scaling_expert',
                text: 'Goku wins this easily. Ultra Instinct puts him in a completely different league than Superman.',
                upvotes: 34,
                time: '3 hours ago'
            },
            {
                author: 'dc_comics_defender',
                text: 'Superman has no upper limit to his power though. He always finds a way to overcome any challenge.',
                upvotes: 28,
                time: '2 hours ago'
            }
        ],
        4: [
            {
                author: 'experienced_hiker',
                text: 'Great list! I would add that most people overpack. A good knife and fire starter are worth more than 20 gadgets.',
                upvotes: 45,
                time: '2 hours ago'
            }
        ],
        5: [
            {
                author: 'minimalist_traveler',
                text: 'Love this setup! How do you handle laundry on longer trips? Thats always my biggest challenge.',
                upvotes: 56,
                time: '4 hours ago'
            }
        ]
    };
}

// Function to get random slang terms for AI prompts
function getRandomSlangTerms(count = 15) {
    if (slangTerms.length === 0) {
        return ['tbh', 'ngl', 'fr', 'lowkey', 'deadass']; // Emergency fallback
    }
    const shuffled = [...slangTerms].sort(() => 0.5 - Math.random());
    return shuffled.slice(0, Math.min(count, slangTerms.length));
}

// Function to get random emojis for AI prompts
function getRandomEmojis(count = 30) {
    if (emojiCharacters.length === 0) {
        return ['😀', '😂', '😍', '😢', '😡']; // Emergency fallback
    }
    const shuffled = [...emojiCharacters].sort(() => 0.5 - Math.random());
    return shuffled.slice(0, Math.min(count, emojiCharacters.length));
}

// Function to generate dynamic slang examples with meanings
function generateSlangExamples() {
    const selectedTerms = getRandomSlangTerms(10);
    return selectedTerms.map(term => {
        const meaning = slangMeanings[term];
        return meaning ? `${term} (${meaning})` : term;
    }).join(', ');
}

// Load data on server startup
loadSlangDataset();
loadEmojiDataset();
loadRedditPostsAndComments();

// Generate realistic usernames for AI responses
const aiUsernames = [
    "curious_mind_42", "thoughtful_observer", "reddit_philosopher", "logic_seeker",
    "wisdom_hunter", "deep_thinker_99", "knowledge_quest", "rational_voice",
    "insight_finder", "truth_explorer", "mind_wanderer", "idea_chaser"
];

// Human usernames for responses
const humanUsernames = [
    "redditor_2024", "science_fan", "vibezwithme", "discussion_lover", "random_user_42",
    "truth_seeker", "skeptical_mind", "everyday_person", "reddit_lurker", "comment_writer",
    "norman", "hessoy", "just_browsing", "koala78", "forum_user"
];

// Get random AI username
function getRandomAIUsername() {
    return aiUsernames[Math.floor(Math.random() * aiUsernames.length)];
}

// Get random human username  
function getRandomHumanUsername() {
    return humanUsernames[Math.floor(Math.random() * humanUsernames.length)];
}

// Human response templates based on AI constraint level
const humanResponses = {
    constrained: [
        "Can you explain that in normal English please? 😅",
        "I'm not sure I follow... could you be more specific?",
        "lol ok but seriously what do you actually think?",
        "I feel like I need a translator for this comment",
        "This gave me a headache trying to understand it",
        "Are you having a stroke? This makes no sense",
        "Could you try again but with actual words?",
        "I think you used every emoji except the ones that make sense",
        "My brain hurts reading this",
        "Is this English? I genuinely can't tell",
        "Why are you using so many emojis? Just say what you mean!",
        "Who has let this person on the internet? 😂",
        "This is like reading a foreign language",
    ],
    normal: [
        "Great point! I hadn't thought about it that way.",
        "I partially agree, but I think there's more nuance to consider.",
        "Interesting perspective. Do you have any sources on that?",
        "This is exactly what I was thinking but couldn't articulate.",
        "I disagree, but I appreciate the thoughtful response.",
        "Thanks for the detailed explanation, that really helps.",
        "You make a good argument. I'm convinced.",
        "I see your point, though I'm not entirely sure I agree.",
        "This adds a lot to the discussion, thanks for sharing.",
        "Really insightful comment, learned something new today."
    ],
    academic: [
        "Wow, that's incredibly well-articulated. Are you in academia?",
        "This reads like it's straight out of a research paper. Impressive!",
        "I feel like I just got schooled. Thanks for the education!",
        "Your vocabulary is making me feel inadequate 😅",
        "This is the kind of analysis I come to Reddit for.",
        "I need to read this three times to fully understand it, but excellent point.",
        "Are you a professor? This is PhD-level analysis.",
        "I wish I could write as eloquently as you do.",
        "This comment is better than most papers I've read.",
        "You just turned a Reddit thread into a academic symposium."
    ]
};

// API Routes

// Get all posts
app.get('/api/posts', (req, res) => {
    res.json(redditPosts);
});

// Get specific post with REAL comments
app.get('/api/posts/:id', (req, res) => {
    const postId = parseInt(req.params.id);
    const post = redditPosts.find(p => p.id === postId);
    
    if (!post) {
        return res.status(404).json({ error: 'Post not found' });
    }
    
    // Use real Reddit comments if available, otherwise fallback
    const comments = realComments[postId] || [];
    res.json({ post, comments });
});

// Get analytics data
app.get('/api/analytics', (req, res) => {
    res.json(analyticsData);
});

// Reset analytics data
app.post('/api/analytics/reset', (req, res) => {
    analyticsData = {
        comments: [],
        vocabularyStats: {
            normal: { uniqueWords: 0, totalWords: 0, avgLength: 0 },
            constrained: { uniqueWords: 0, totalWords: 0, avgLength: 0 },
            academic: { uniqueWords: 0, totalWords: 0, avgLength: 0 }
        },
        constraintDistribution: { normal: 0, constrained: 0, academic: 0 },
        emojiUsage: [],
        commentLengths: []
    };
    res.json({ success: true, message: 'Analytics data reset' });
});

// Generate AI comment with analytics tracking
app.post('/api/generate-comment', async (req, res) => {
    try {
        const { postContent, constraintLevel = 'normal' } = req.body;
        
        console.log('Generating AI comment with constraint level:', constraintLevel);

        // Define different constraint prompts
        let systemPrompt;
        switch(constraintLevel) {
            case 'constrained':
                const randomSlangTerms = getRandomSlangTerms(20);
                const slangExamples = generateSlangExamples();
                const randomEmojis = getRandomEmojis(40);

                systemPrompt = `You are commenting on Reddit. You must respond using only very casual internet slang, abbreviations, and emojis. 
                Try and write paragraphs to express an opinion in depth just restrict your use of terms with normal language.
                
                USE THESE SLANG TERMS: ${randomSlangTerms.join(', ')}
                Examples with meanings: ${slangExamples}
                
                USE THESE EMOJIS AS VOCABULARY : ${randomEmojis.join(' ')}
                
                You cannot use any other emojis or formal language. Sound like a typical young Reddit user expressing complex thoughts through constrained vocabulary.`;
                break; 

            case 'normal':
                systemPrompt = `You are a typical Reddit user commenting on a post. Respond naturally and conversationally, like a real person would. Be engaging but not overly formal. Keep it concise (1-3 sentences). Show genuine interest or provide a thoughtful perspective.`;
                break;
                
            case 'academic':
                systemPrompt = `You are a highly educated Reddit user commenting on a post. Use sophisticated vocabulary, complex sentence structures, and academic language. Reference relevant theories, concepts, or research when appropriate. Sound like a professor or graduate student.`;
                break;
                
            default:
                systemPrompt = `You are a typical Reddit user commenting on a post. Respond naturally and conversationally.`;
        }

        // Prepare the request for Claude API
        const claudeRequest = {
            model: "claude-3-5-sonnet-20241022",
            max_tokens: 200,
            messages: [
                {
                    "role": "user",
                    "content": `${systemPrompt}\n\nPost to comment on: "${postContent}"\n\nWrite a comment:`
                }
            ]
        };

        // Make request to Claude API
        const response = await fetch('https://api.anthropic.com/v1/messages', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-api-key': API_KEY,
                'anthropic-version': '2023-06-01'
            },
            body: JSON.stringify(claudeRequest)
        });

        const data = await response.json();
        console.log('Claude response:', data);

        if (data.content && data.content[0] && data.content[0].text) {
            const commentText = data.content[0].text.trim();
            
            // ANALYTICS: Analyze the generated comment
            const commentAnalysis = analyzeComment(commentText, constraintLevel);
            updateAnalytics(commentAnalysis);
            
            // Generate realistic metadata for the AI comment
            const aiComment = {
                id: Date.now(),
                author: getRandomAIUsername(),
                text: commentText,
                upvotes: Math.floor(Math.random() * 50) + 1,
                time: "now",
                isAI: true,
                constraintLevel: constraintLevel,
                analytics: commentAnalysis
            };
            
            res.json(aiComment);
        } else {
            console.error('Unexpected Claude response format:', data);
            res.status(500).json({ error: 'Failed to generate comment' });
        }

    } catch (error) {
        console.error('Error generating AI comment:', error);
        res.status(500).json({ error: 'Failed to generate comment' });
    }
});

// Generate human response to AI comment
app.post('/api/generate-human-response', async (req, res) => {
    try {
        const { aiComment, constraintLevel } = req.body;
        
        console.log('Generating human response to AI comment with constraint level:', constraintLevel);

        // Select appropriate response based on AI's constraint level
        const responseOptions = humanResponses[constraintLevel] || humanResponses.normal;
        const responseText = responseOptions[Math.floor(Math.random() * responseOptions.length)];
        
        // Generate realistic metadata for the human response
        const humanResponse = {
            id: Date.now() + Math.random(),
            author: getRandomHumanUsername(),
            text: responseText,
            upvotes: Math.floor(Math.random() * 30) + 1,
            time: "now",
            isHuman: true,
            replyingTo: aiComment.author
        };
        
        res.json(humanResponse);

    } catch (error) {
        console.error('Error generating human response:', error);
        res.status(500).json({ error: 'Failed to generate human response' });
    }
});

// Vote on post or comment
app.post('/api/vote', (req, res) => {
    const { type, id, direction } = req.body;
    
    // Simulate voting
    const change = direction === 'up' ? Math.floor(Math.random() * 5) + 1 : -(Math.floor(Math.random() * 3) + 1);
    
    res.json({ success: true, change: change });
});

// Get posts info endpoint (for debugging)
app.get('/api/posts-info', (req, res) => {
    const postsWithComments = Object.keys(realComments).length;
    const totalComments = Object.values(realComments).reduce((sum, comments) => sum + comments.length, 0);
    
    res.json({
        totalPosts: redditPosts.length,
        postsWithComments: postsWithComments,
        totalRealComments: totalComments,
        hasLocalFile: fs.existsSync(path.join(__dirname, 'reddit_posts.json')),
        sampleTitles: redditPosts.slice(0, 5).map(p => p.title.substring(0, 60) + '...'),
        subreddits: [...new Set(redditPosts.map(p => p.subreddit))],
        sampleComment: totalComments > 0 ? Object.values(realComments)[0][0]?.text?.substring(0, 100) + '...' : 'No comments loaded'
    });
});

// Get slang data endpoint (for debugging/research)
app.get('/api/slang', (req, res) => {
    res.json({
        totalTerms: slangTerms.length,
        sampleTerms: slangTerms.slice(0, 20),
        randomSelection: getRandomSlangTerms(10),
        hasLocalFile: fs.existsSync(path.join(__dirname, 'slang_data.json'))
    });
});

// Get emoji data endpoint (for debugging/research)
app.get('/api/emojis', (req, res) => {
    res.json({
        totalEmojis: emojiCharacters.length,
        sampleEmojis: emojiCharacters.slice(0, 50),
        randomSelection: getRandomEmojis(20),
        hasLocalFile: fs.existsSync(path.join(__dirname, 'data/emoji_dataset/full_emoji.csv'))
    });
});

// Start the server
app.listen(port, () => {
    console.log(`Reddit simulation server running at http://localhost:${port}`);
    console.log('Open your browser and go to http://localhost:3000');
    console.log(` Posts loaded: ${redditPosts.length}`);
    console.log(` Real comments loaded: ${Object.keys(realComments).length} posts have comments`);
    console.log(`Slang terms loaded: ${slangTerms.length}`);
    console.log(`😀 Emojis loaded: ${emojiCharacters.length}`);
});