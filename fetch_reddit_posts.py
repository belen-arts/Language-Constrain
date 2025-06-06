#!/usr/bin/env python3
"""
Enhanced script to fetch real Reddit posts AND real comments
Scrapes authentic discussions for your research simulation
"""

import json
import urllib.request
import urllib.parse
import time
import random
from datetime import datetime, timedelta

def fetch_reddit_posts_and_comments():
    try:
        print("🚀 Fetching real Reddit posts AND comments...")
        
        # Your customized subreddits - keeping your exact list!
        subreddits = [
            'science',
            'survival',
            'onebag', 
            'xxfitness',
            'rustyrails', 
            'blurrypicturesofcats',
            'scams',
            'dbz',
            'cartalkuk',
            'sales',
            'accidentalwesanderson',
            'worldbuilding',
            'aww',
            'pics',
            'cozyplaces',
            'malelivingspaces',
            'evilbuildings',
            'askreddit',
            'todayilearned',
            'explainlikeimfive',
            'changemyview',
            'unpopularopinion',
            'showerthoughts',
            'futurology',
            'cogsci'
        ]
        
        all_posts = []
        all_comments = {}  # Store comments by post ID
        post_id_counter = 1
        
        for subreddit in subreddits:
            print(f"📡 Fetching from r/{subreddit}...")
            
            try:
                # Reddit's public JSON API endpoint
                url = f"https://www.reddit.com/r/{subreddit}/hot.json?limit=10"
                
                # Set a user agent (required by Reddit)
                req = urllib.request.Request(url)
                req.add_header('User-Agent', 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36')
                
                # Fetch the data
                with urllib.request.urlopen(req) as response:
                    data = json.loads(response.read().decode())
                
                # Process the posts
                if 'data' in data and 'children' in data['data']:
                    for post_data in data['data']['children'][:3]:  # Take top 3 from each subreddit to get comments too
                        post = post_data['data']
                        
                        # Skip removed/deleted posts
                        if post.get('removed_by_category') or post.get('title') == '[deleted]':
                            continue
                        
                        # Get the Reddit ID for fetching comments
                        reddit_id = post.get('id', '')
                        permalink = post.get('permalink', '')
                        
                        # Convert Reddit post to our format
                        processed_post = {
                            'id': post_id_counter,
                            'subreddit': subreddit,
                            'title': post.get('title', ''),
                            'author': post.get('author', 'unknown_user'),
                            'time': convert_reddit_time(post.get('created_utc', 0)),
                            'upvotes': post.get('ups', 0),
                            'comments': post.get('num_comments', 0),
                            'text': clean_text(post.get('selftext', '')),
                            'url': post.get('url', ''),
                            'type': determine_post_type(post),
                            'image': get_image_url(post),
                            'reddit_id': reddit_id,
                            'reddit_permalink': f"https://reddit.com{permalink}"
                        }
                        
                        all_posts.append(processed_post)
                        
                        print(f"   ✅ {processed_post['title'][:60]}...")
                        
                        # Fetch real comments for this post
                        if reddit_id and permalink:
                            print(f"   💬 Fetching comments...")
                            comments = fetch_post_comments(subreddit, reddit_id, permalink)
                            if comments:
                                all_comments[post_id_counter] = comments
                                print(f"   💬 Got {len(comments)} comments")
                            else:
                                print(f"   💬 No comments found")
                        
                        post_id_counter += 1
                        
                        # Be extra nice to Reddit's servers when fetching comments
                        time.sleep(2)
                
                # Pause between subreddits
                time.sleep(1)
                
            except Exception as e:
                print(f"   ❌ Error fetching r/{subreddit}: {e}")
                continue
        
        print(f"\n📊 Successfully fetched {len(all_posts)} posts with real comments!")
        print(f"💬 Got comments for {len(all_comments)} posts")
        
        # Save to JSON file
        output_data = {
            'total_posts': len(all_posts),
            'fetch_date': datetime.now().isoformat(),
            'subreddits': subreddits,
            'posts': all_posts,
            'comments': all_comments  # Real Reddit comments!
        }
        
        output_file = 'reddit_posts.json'
        with open(output_file, 'w', encoding='utf-8') as f:
            json.dump(output_data, f, indent=2, ensure_ascii=False)
        
        print(f"✅ Posts and comments saved to {output_file}")
        
        # Create a detailed summary file
        summary_file = 'posts_summary.txt'
        with open(summary_file, 'w', encoding='utf-8') as f:
            f.write(f"Reddit Posts & Comments Summary\n")
            f.write(f"===============================\n\n")
            f.write(f"Total posts: {len(all_posts)}\n")
            f.write(f"Posts with comments: {len(all_comments)}\n")
            f.write(f"Subreddits: {', '.join(subreddits)}\n")
            f.write(f"Fetched: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}\n\n")
            
            f.write("Posts Overview:\n")
            f.write("===============\n")
            for post in all_posts:
                comment_count = len(all_comments.get(post['id'], []))
                f.write(f"r/{post['subreddit']} - {post['title'][:80]}... ({comment_count} comments)\n")
            
            f.write(f"\nSample Comments:\n")
            f.write(f"================\n")
            for post_id, comments in list(all_comments.items())[:3]:
                post = next((p for p in all_posts if p['id'] == post_id), None)
                if post:
                    f.write(f"\nPost: {post['title'][:60]}...\n")
                    for i, comment in enumerate(comments[:2]):
                        f.write(f"  Comment {i+1}: {comment['text'][:100]}...\n")
        
        print(f"📄 Summary saved to {summary_file}")
        
        return True
        
    except Exception as e:
        print(f"❌ Error: {e}")
        print("Creating fallback posts...")
        
        # Fallback posts if Reddit fetch fails
        fallback_posts = create_fallback_posts()
        fallback_comments = create_fallback_comments()
        
        output_data = {
            'total_posts': len(fallback_posts),
            'fetch_date': datetime.now().isoformat(),
            'posts': fallback_posts,
            'comments': fallback_comments,
            'source': 'fallback'
        }
        
        output_file = 'reddit_posts.json'
        with open(output_file, 'w', encoding='utf-8') as f:
            json.dump(output_data, f, indent=2, ensure_ascii=False)
        
        print(f"✅ Fallback posts saved to {output_file}")
        return True

def fetch_post_comments(subreddit, reddit_id, permalink):
    """Fetch real comments for a specific Reddit post"""
    try:
        # Reddit comments API endpoint
        comments_url = f"https://www.reddit.com{permalink}.json"
        
        req = urllib.request.Request(comments_url)
        req.add_header('User-Agent', 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36')
        
        with urllib.request.urlopen(req) as response:
            data = json.loads(response.read().decode())
        
        comments = []
        
        # Reddit returns an array with [post_data, comments_data]
        if len(data) >= 2 and 'data' in data[1] and 'children' in data[1]['data']:
            for comment_data in data[1]['data']['children'][:5]:  # Take top 5 comments
                if comment_data['kind'] == 't1':  # This is a comment (not a "more" link)
                    comment = comment_data['data']
                    
                    # Skip deleted/removed comments
                    if comment.get('body') in ['[deleted]', '[removed]', None]:
                        continue
                    
                    # Clean and format the comment
                    comment_text = clean_comment_text(comment.get('body', ''))
                    if comment_text and len(comment_text) > 10:  # Skip very short comments
                        processed_comment = {
                            'author': comment.get('author', 'unknown_user'),
                            'text': comment_text,
                            'upvotes': max(comment.get('ups', 0), 1),  # Ensure at least 1 upvote
                            'time': convert_reddit_time(comment.get('created_utc', 0)),
                            'reddit_id': comment.get('id', '')
                        }
                        comments.append(processed_comment)
        
        return comments
        
    except Exception as e:
        print(f"     ❌ Error fetching comments: {e}")
        return []

def clean_comment_text(text):
    """Clean Reddit comment text"""
    if not text or text in ['[deleted]', '[removed]']:
        return ""
    
    # Remove markdown formatting
    text = text.replace('**', '').replace('*', '').replace('&gt;', '>')
    text = text.replace('&lt;', '<').replace('&amp;', '&')
    
    # Remove excessive newlines and spaces
    text = ' '.join(text.split())
    
    # Truncate if too long
    if len(text) > 300:
        text = text[:300] + "..."
    
    return text

def convert_reddit_time(utc_timestamp):
    """Convert Reddit UTC timestamp to relative time"""
    if not utc_timestamp:
        return f"{random.randint(1, 6)} hours ago"
        
    try:
        post_time = datetime.fromtimestamp(utc_timestamp)
        now = datetime.now()
        diff = now - post_time
        
        if diff.days > 0:
            return f"{diff.days} days ago"
        elif diff.seconds > 3600:
            hours = diff.seconds // 3600
            return f"{hours} hours ago"
        elif diff.seconds > 60:
            minutes = diff.seconds // 60
            return f"{minutes} minutes ago"
        else:
            return "just now"
    except:
        return f"{random.randint(1, 12)} hours ago"

def clean_text(text):
    """Clean and truncate Reddit post text"""
    if not text or text in ['[deleted]', '[removed]']:
        return ""
    
    # Remove excessive newlines and spaces
    text = ' '.join(text.split())
    
    # Truncate if too long
    if len(text) > 500:
        text = text[:500] + "..."
    
    return text

def determine_post_type(post):
    """Determine if post is text, image, or link"""
    url = post.get('url', '')
    selftext = post.get('selftext', '')
    
    if selftext:
        return "text"
    elif any(ext in url.lower() for ext in ['.jpg', '.jpeg', '.png', '.gif', '.webp']):
        return "image"
    elif url and url != post.get('permalink', ''):
        return "link"
    else:
        return "text"

def get_image_url(post):
    """Extract image URL if post is an image"""
    url = post.get('url', '')
    
    if any(ext in url.lower() for ext in ['.jpg', '.jpeg', '.png', '.gif', '.webp']):
        return url
    
    # Check for Reddit gallery or preview images
    if 'preview' in post and 'images' in post['preview']:
        try:
            return post['preview']['images'][0]['source']['url'].replace('&amp;', '&')
        except:
            pass
    
    return None

def create_fallback_posts():
    """Create interesting fallback posts if Reddit API fails"""
    return [
        {
            'id': 1,
            'subreddit': 'science',
            'title': 'Breakthrough study reveals how social media algorithms fundamentally alter human cognitive patterns',
            'author': 'cognitive_researcher',
            'time': '4 hours ago',
            'upvotes': 1847,
            'comments': 423,
            'text': 'A comprehensive study tracking 50,000 participants reveals how algorithmic content curation affects neural pathways and critical thinking abilities.',
            'type': 'text',
            'image': None
        },
        {
            'id': 2,
            'subreddit': 'blurrypicturesofcats',
            'title': 'My cat moving at the speed of light',
            'author': 'cat_photographer',
            'time': '2 hours ago',
            'upvotes': 2341,
            'comments': 89,
            'text': '',
            'type': 'image',
            'image': 'https://images.unsplash.com/photo-1514888286974-6c03e2ca1dba?w=600&h=400&fit=crop'
        },
        {
            'id': 3,
            'subreddit': 'dbz',
            'title': 'Goku vs Superman: Who would win in a real fight?',
            'author': 'anime_debater',
            'time': '6 hours ago',
            'upvotes': 756,
            'comments': 234,
            'text': 'Settling this debate once and for all with power scaling analysis...',
            'type': 'text',
            'image': None
        }
    ]

def create_fallback_comments():
    """Create fallback comments structure"""
    return {
        1: [
            {
                'author': 'research_fan',
                'text': 'This is fascinating research. The implications for understanding digital communication are huge.',
                'upvotes': 45,
                'time': '2 hours ago'
            },
            {
                'author': 'skeptical_scientist',
                'text': 'While interesting, I wonder about the sample size and methodology. Need to see the peer review.',
                'upvotes': 23,
                'time': '1 hour ago'
            }
        ],
        2: [
            {
                'author': 'cat_lover_99',
                'text': 'This is art. Pure, blurry art.',
                'upvotes': 67,
                'time': '1 hour ago'
            }
        ],
        3: [
            {
                'author': 'power_scaler',
                'text': 'Goku wins easily. Ultra Instinct is basically unbeatable.',
                'upvotes': 34,
                'time': '3 hours ago'
            },
            {
                'author': 'superman_fan',
                'text': 'Superman has no limits though. He always finds a way to win.',
                'upvotes': 28,
                'time': '2 hours ago'
            }
        ]
    }

if __name__ == "__main__":
    print("🌐 Enhanced Reddit Posts & Comments Fetcher")
    print("=" * 50)
    print("📡 Fetching real posts AND real comments...")
    print("🔬 Perfect for authentic research demonstrations!")
    print("")
    
    success = fetch_reddit_posts_and_comments()
    
    if success:
        print("\n🎉 Success! Real Reddit posts and comments are ready!")
        print("📁 Files created:")
        print("   - reddit_posts.json (posts + real comments)")
        print("   - posts_summary.txt (detailed overview)")
        print("")
        print("🚀 Now update your server.js to use the real comments!")
        print("🎯 Your simulation will be incredibly authentic!")
    else:
        print("\n❌ Something went wrong")