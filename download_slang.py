#!/usr/bin/env python3
"""
Script to download Gen Z slang dataset using pandas and save to JSON file
"""

import pandas as pd
import json
import os

def download_slang_dataset():
    try:
        print("Downloading Gen Z slang dataset...")
        
        # Load the dataset using pandas
        df = pd.read_csv("hf://datasets/MLBtrio/genz-slang-dataset/all_slangs.csv")
        
        print(f"Dataset loaded! Shape: {df.shape}")
        print(f"Columns: {df.columns.tolist()}")
        
        # Show first few rows
        print("\nFirst 5 rows:")
        print(df.head())
        
        # Clean and process the data
        slang_data = []
        slang_terms = []
        slang_meanings = {}
        
        for index, row in df.iterrows():
            # Handle different possible column names
            slang_term = None
            meaning = None
            
            # Try different column names that might contain slang terms
            possible_slang_columns = ['slang', 'term', 'word', 'phrase']
            possible_meaning_columns = ['meaning', 'definition', 'explanation', 'description']
            
            for col in possible_slang_columns:
                if col in df.columns and pd.notna(row[col]):
                    slang_term = str(row[col]).strip().lower()
                    break
            
            for col in possible_meaning_columns:
                if col in df.columns and pd.notna(row[col]):
                    meaning = str(row[col]).strip()
                    break
            
            # If we found both slang term and meaning, add them
            if slang_term and meaning and slang_term != '' and meaning != '':
                slang_data.append({
                    'slang': slang_term,
                    'meaning': meaning
                })
                slang_terms.append(slang_term)
                slang_meanings[slang_term] = meaning
        
        print(f"\nProcessed {len(slang_terms)} slang terms")
        print(f"Sample terms: {slang_terms[:10]}")
        
        # Save to JSON file
        output_data = {
            'total_terms': len(slang_terms),
            'terms': slang_terms,
            'meanings': slang_meanings,
            'full_data': slang_data
        }
        
        # Save to the same directory as the script
        output_file = 'slang_data.json'
        with open(output_file, 'w', encoding='utf-8') as f:
            json.dump(output_data, f, indent=2, ensure_ascii=False)
        
        print(f"\n✅ Slang data saved to {output_file}")
        print(f"📊 Total terms saved: {len(slang_terms)}")
        
        # Also save a simple text file with just the terms
        terms_file = 'slang_terms.txt'
        with open(terms_file, 'w', encoding='utf-8') as f:
            for term in slang_terms:
                f.write(f"{term}\n")
        
        print(f"📝 Terms list saved to {terms_file}")
        
        return True
        
    except Exception as e:
        print(f"❌ Error downloading dataset: {e}")
        print("\nTrying alternative approach...")
        
        # Fallback: create a comprehensive slang list manually
        fallback_slang = {
            'tbh': 'to be honest',
            'ngl': 'not gonna lie',
            'fr': 'for real',
            'lowkey': 'somewhat or secretly',
            'highkey': 'obviously or very much',
            'deadass': 'seriously or honestly',
            'no cap': 'no lie, for real',
            'periodt': 'period, end of discussion',
            'slay': 'to do something really well',
            'bestie': 'best friend',
            'queen': 'someone amazing',
            'king': 'someone amazing (masculine)',
            'iconic': 'legendary or memorable',
            'legend': 'someone amazing',
            'fire': 'awesome or excellent',
            'based': 'agreeable or admirable',
            'cringe': 'embarrassing or awkward',
            'mid': 'mediocre or average',
            'bussin': 'really good',
            'sheesh': 'expression of amazement',
            'fam': 'family or close friends',
            'bet': 'agreement or confirmation',
            'cap': 'lie or false statement',
            'facts': 'truth or agreement',
            'snatched': 'looking good',
            'tea': 'gossip or truth',
            'spill': 'to tell gossip',
            'stan': 'to be a big fan of',
            'simp': 'someone who does too much for someone they like',
            'flex': 'to show off',
            'clout': 'influence or fame',
            'ghost': 'to ignore someone',
            'vibe': 'feeling or mood',
            'mood': 'relatable feeling',
            'sus': 'suspicious',
            'say less': 'understood',
            'hits different': 'is uniquely good',
            'slaps': 'is really good',
            'sending me': 'making me laugh',
            'rent free': 'constantly thinking about',
            'main character': 'protagonist energy',
            'understood the assignment': 'did exactly what was needed',
            'its giving': 'it seems like',
            'the way': 'expression of emphasis',
            'not me': 'expression of disbelief',
            'pov': 'point of view',
            'iykyk': 'if you know you know',
            'this aint it': 'this is wrong',
            'chile': 'child (expression)',
            'purr': 'expression of approval',
            'periodt pooh': 'period with emphasis',
            'okurrr': 'ok with attitude',
            'sksksks': 'expression of laughter',
            'and i oop': 'awkward moment expression',
            'no literally': 'agreement with emphasis',
            'bestie vibes': 'best friend energy',
            'main character energy': 'confident protagonist vibes',
            'that part': 'agreement with emphasis',
            'the tea': 'the truth or gossip',
            'spill the tea': 'tell the gossip',
            'sis': 'sister (term of endearment)',
            'bro': 'brother (casual)',
            'dude': 'person (casual)',
            'mans': 'person (slang)',
            'homie': 'friend',
            'squad': 'friend group',
            'crew': 'group of friends',
            'gang': 'friend group',
            'tribe': 'close group',
            'rizz': 'charisma',
            'ratio': 'when reply gets more likes',
            'touch grass': 'go outside',
            'chronically online': 'too much internet time',
            'gaslight gatekeep girlboss': 'satirical phrase',
            'chefs kiss': 'perfect',
            'ate and left no crumbs': 'did perfectly',
            'mother': 'iconic person',
            'serve': 'look good',
            'soft launch': 'subtle introduction',
            'hard launch': 'official announcement',
            'green flag': 'positive sign',
            'red flag': 'warning sign',
            'ick': 'sudden turn-off',
            'w': 'win',
            'l': 'loss',
            'npc': 'basic person',
            'pick me': 'attention seeker',
            'im deceased': 'very funny',
            'sending': 'hilarious',
            'no thoughts head empty': 'not thinking',
            'brain go brrr': 'intense thinking',
            'himbo': 'attractive but not smart guy',
            'girlboss': 'successful woman',
            'karen': 'entitled person',
            'ok boomer': 'dismissive to older person',
            'very demure': 'very modest',
            'very mindful': 'very aware',
            'very cutesy': 'very cute'
        }
        
        slang_terms = list(fallback_slang.keys())
        slang_meanings = fallback_slang
        
        output_data = {
            'total_terms': len(slang_terms),
            'terms': slang_terms,
            'meanings': slang_meanings,
            'full_data': [{'slang': k, 'meaning': v} for k, v in fallback_slang.items()]
        }
        
        output_file = 'slang_data.json'
        with open(output_file, 'w', encoding='utf-8') as f:
            json.dump(output_data, f, indent=2, ensure_ascii=False)
        
        print(f"✅ Fallback slang data saved to {output_file}")
        print(f"📊 Total terms saved: {len(slang_terms)}")
        
        return True

if __name__ == "__main__":
    print("🚀 Gen Z Slang Dataset Downloader")
    print("=" * 50)
    
    success = download_slang_dataset()
    
    if success:
        print("\n✅ Done! You can now run your Node.js server.")
        print("📁 Files created:")
        print("   - slang_data.json (for your Node.js server)")
        print("   - slang_terms.txt (simple list)")
    else:
        print("\n❌ Failed to download dataset")