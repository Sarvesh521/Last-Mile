import os
import time
import json
import requests
import redis

# In this specific setup, Redis is on "localhost" because 
# this script runs INSIDE the same container as Redis.
r = redis.Redis(host='localhost', port=6379, decode_responses=True)

def fetch_and_store():
    api_key = "AIzaSyAirLVe4aBHUqN5CaZjf7eBvXMAjTfbHI8"
    if not api_key:
        print("No API Key found. Skipping data fetch.")
        return

    print("Fetching Bangalore Metro stations...")
    url = "https://maps.googleapis.com/maps/api/place/textsearch/json"
    params = {'query': "Metro stations in Bangalore", 'key': api_key}
    
    try:
        response = requests.get(url, params=params)
        if response.status_code == 200:
            results = response.json().get('results', [])
            
            key = "bangalore_metro_stations"
            r.delete(key) # Clear old data
            
            for station in results:
                data = {
                    "name": station.get('name'),
                    "address": station.get('formatted_address'),
                    "location": station['geometry']['location']
                }
                r.rpush(key, json.dumps(data))
            print(f"Done! Stored {len(results)} stations in Redis.")
        else:
            print(f"API Error: {response.text}")
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    # Wait briefly for Redis to fully initialize
    time.sleep(2)
    fetch_and_store()