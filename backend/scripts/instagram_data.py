import sys
import re
import requests
from requests.models import parse_url
from pymongo import MongoClient
from bson.objectid import ObjectId
from pprint import pprint
from datetime import datetime
from operator import itemgetter

connection_string = 'mongodb://admin:prJZiti2GSAyiCdKpirx7fDLTOW2w63e@167.71.61.2:27017'
client = MongoClient(connection_string)

if len(sys.argv) == 3:
    if sys.argv[2] == 'dev':
        connection_string = 'mongodb+srv://rapidfire:JEuLtg3IlD7s36t@influ-ai-plf7h.mongodb.net'
        client = MongoClient(
            connection_string, ssl_cert_reqs=requests.ssl.CERT_NONE)

users = client['influ-ai'].users

BASE_URL_V7 = 'https://graph.facebook.com/v7.0/'
latcherzar_instagram_info = users.find({"name": "Лъчезар Младенов"})[0]
fb_graph_token_latchezar = latcherzar_instagram_info["fbgraph_token"]
instagram_id_latchezar = latcherzar_instagram_info["instagram_id"]

def get_instagram_username(channels):
    for channel in channels:
        if "instagram" in channel["link"]:
            return channel["link"].split('instagram.com/')[1].replace('/','').split('?')[0]
    return None

def get_user_engagement_rate(json_response, username):
    followers_count = json_response['business_discovery']["followers_count"]
    total_engagement = 0
    needed_posts_count = 25
    posts = json_response['business_discovery']['media']['data']
    current_posts_count = 0
    while current_posts_count < needed_posts_count and posts != []:
        for post in posts:
            if 'like_count' in post and 'comments_count' in post:
                comments_count = post["comments_count"]
                like_count = post["like_count"]
                total_engagement += like_count + comments_count
                current_posts_count += 1
            if current_posts_count >= needed_posts_count:
                break
        cursors = json_response['business_discovery']['media']['paging']['cursors']
        if 'after' in cursors:
            after_cursor = cursors['after']
            posts = get_more_posts(username=username, after_cursor=after_cursor)
        else:
            posts = []
    return ((total_engagement / current_posts_count) / followers_count) * 100

def get_more_posts(username, after_cursor):
    request_url = (
        BASE_URL_V7
        + instagram_id_latchezar
        + f"?fields=business_discovery.username({username})"
        + f"{{media.after({after_cursor}){{comments_count, like_count}}}}&access_token="
        + fb_graph_token_latchezar
    )
    response = requests.get(request_url, timeout=30)
    json_response = response.json()
    posts = json_response['business_discovery']['media']['data']
    return posts

def get_payload_with_instagram_engagement_rate(influencer):
    username = get_instagram_username(influencer["channels"])
    request_url = (
        BASE_URL_V7
        + instagram_id_latchezar
        + f"?fields=business_discovery.username({username})"
        + "{followers_count, media{comments_count,like_count}}&access_token="
        + fb_graph_token_latchezar
    )
    response = requests.get(request_url, timeout=30)
    json_response = response.json()
    instagram_engagement_rate = get_user_engagement_rate(json_response, username)
    payload = {'instagram_engagement_rate':instagram_engagement_rate}
    return payload

def insert_influencer_info(influencer):
    if 'fbgraph_token' in influencer and len(influencer['fbgraph_token']) > 0 and "instagram_id" in influencer and len(influencer['instagram_id']) > 0:
        response = requests.get(BASE_URL_V7 +
                                influencer['instagram_id'] + '?fields=profile_picture_url,followers_count&access_token=' + influencer['fbgraph_token'])
        json_response = response.json()
        if 'followers_count' in json_response and 'profile_picture_url' in json_response:
            users.update_one({"_id": influencer['_id']}, {"$set": {
                             'instagram_total_followers': json_response['followers_count'], 'profile_picture': json_response['profile_picture_url']}})
            followers_count = json_response['followers_count']
        else:
            print("error " + str(influencer['_id']))
            sys.exit()

        response = requests.get(BASE_URL_V7 +
                                influencer['instagram_id'] + '/insights?metric=audience_city&period=lifetime&access_token=' + influencer['fbgraph_token'])
        json_response = response.json()

        if not 'data' in json_response:
            pprint(json_response)
            return

        instagram_cities = {}
        for pair in json_response['data'][0]['values'][0]['value']:
            instagram_cities[pair] = json_response['data'][0]['values'][0]['value'][pair]

        if len(instagram_cities) > 0:
            instagram_cities = dict(sorted(instagram_cities.items(), key=lambda item: item[1], reverse=True))

            users.update_one({"_id": influencer['_id']}, {
                             "$set": {'instagram_cities': instagram_cities}})
        else:
            print("error " + str(influencer['_id']))
            sys.exit()
        
        response = requests.get(BASE_URL_V7 +
                                influencer['instagram_id'] + '/insights?metric=audience_gender_age&period=lifetime&access_token=' + influencer['fbgraph_token'])
        json_response = response.json()

        instagram_followers = {'male': 0, 'female': 0}
        instagram_age = {}

        for pair in json_response['data'][0]['values'][0]['value']:
            if (pair[0] == "M"):
                instagram_followers['male'] += json_response['data'][0]['values'][0]['value'][pair]
            else:
                instagram_followers['female'] += json_response['data'][0]['values'][0]['value'][pair]

            if pair.split(".")[1] in instagram_age:
                instagram_age[pair.split(
                    ".")[1]] += json_response['data'][0]['values'][0]['value'][pair]
            else:
                instagram_age[pair.split(
                    ".")[1]] = json_response['data'][0]['values'][0]['value'][pair]

        if len(instagram_age) > 0 and instagram_followers['male'] != 0:
            instagram_followers_top = 'female'
            if instagram_followers['male'] > instagram_followers['female']:
                instagram_followers_top = 'male'

            top_age = max(instagram_age, key=instagram_age.get)

            users.update_one({"_id": influencer['_id']}, {"$set": {
                'instagram_followers': instagram_followers, 
                'instagram_followers_top': instagram_followers_top,
                'instagram_age': instagram_age,
                'instagram_age_top': top_age
                }})

        else:
            print("error " + str(influencer['_id']))
            sys.exit()

        instagram_hashtags_map = {}
        instagram_mentions_map = {}
        instagram_posts = []

        request = BASE_URL_V7 + \
            influencer['instagram_id'] + \
            '/media?fields=media_type,media_url,timestamp,comments,caption,like_count,comments_count,insights.metric(impressions,reach,engagement,saved)&access_token=' + \
            influencer['fbgraph_token']
        i = 0
        while True:
            response = requests.get(request)
            json_response = response.json()

            if 'data' not in json_response:
                break

            for post in json_response['data']:
                ig_post = {
                    'id': post['id'],
                    'timestamp': post['timestamp'],
                    'hashtags': [],
                    'mentions': []
                }

                if 'insights' in post and 'data' in post['insights'] and len(post['insights']['data']) > 0:
                    metrics = ['impressions', 'reach', 'engagement', 'saved']
                    for i in range(len(post['insights']['data'])):
                        ig_post[metrics[i]] = post['insights']['data'][i]['values'][0]['value']

                if 'like_count' in post:
                    ig_post['like_count'] = post['like_count']

                if 'comments_count' in post:
                    ig_post['comments_count'] = post['comments_count']

                if 'media_url' in post:
                    ig_post['media_url'] = post['media_url']

                if 'media_type' in post:
                    ig_post['media_type'] = post['media_type']    

                if 'comments' in post:
                    for comment in post['comments']['data']:
                        hashtags = re.findall(r"(?:#)([A-Za-z0-9_](?:(?:[A-Za-z0-9_]|(?:\.(?!\.))){0,28}(?:[A-Za-z0-9_]))?)", comment['text'])
                        mentions = re.findall(r"(?:@)([A-Za-z0-9_](?:(?:[A-Za-z0-9_]|(?:\.(?!\.))){0,28}(?:[A-Za-z0-9_]))?)", comment['text'])                        

                        for hashtag in hashtags:
                            if hashtag in instagram_hashtags_map:
                                instagram_hashtags_map[hashtag] += 1
                            else:
                                instagram_hashtags_map[hashtag] = 1

                            if not hashtag in ig_post['hashtags']:
                                ig_post['hashtags'].append(hashtag)


                        for mention in mentions:
                            if not mention in ig_post['mentions']:
                                ig_post['mentions'].append(mention)

                if 'caption' in post:
                    ig_post['caption'] = post['caption']
                    hashtags = re.findall(r"(?:#)([A-Za-z0-9_](?:(?:[A-Za-z0-9_]|(?:\.(?!\.))){0,28}(?:[A-Za-z0-9_]))?)", post['caption'])
                    mentions = re.findall(r"(?:@)([A-Za-z0-9_](?:(?:[A-Za-z0-9_]|(?:\.(?!\.))){0,28}(?:[A-Za-z0-9_]))?)", post['caption'])

                    for hashtag in hashtags:
                        if hashtag in instagram_hashtags_map:
                            instagram_hashtags_map[hashtag] += 1
                        else:
                            instagram_hashtags_map[hashtag] = 1
                        
                        if not hashtag in ig_post['hashtags']:
                            ig_post['hashtags'].append(hashtag)

                    for mention in mentions:
                        if mention in instagram_mentions_map:
                            instagram_mentions_map[mention] += 1
                        else:
                            instagram_mentions_map[mention] = 1

                        if not mention in ig_post['mentions']:
                            ig_post['mentions'].append(mention)


                instagram_posts.append(ig_post)

            if 'paging' in json_response and 'next' in json_response['paging']:
                request = json_response['paging']['next']
            else:
                break

            i += 1

        instagram_hashtags = []    
        for hashtag_name, hashtag_count in instagram_hashtags_map.items():
            instagram_hashtags.append({"name": hashtag_name, "count": hashtag_count})
            
        instagram_mentions = []    
        for mention_name, mention_count in instagram_mentions_map.items():
            instagram_mentions.append({"name": mention_name, "count": mention_count})

        instagram_hashtags = sorted(instagram_hashtags, key=itemgetter('count'), reverse=True)
        instagram_mentions = sorted(instagram_mentions, key=itemgetter('count'), reverse=True)
        instagram_mentions = [mention["name"] for mention in instagram_mentions]
        instagram_hashtags = [hashtag["name"] for hashtag in instagram_hashtags]

        payload_engagement_rate = get_payload_with_instagram_engagement_rate(influencer)
        engagement_rate = payload_engagement_rate["instagram_engagement_rate"]

        users.update_one({"_id": influencer['_id']}, {"$set": {
                        'instagram_hashtags': instagram_hashtags, 
                        'instagram_mentions': instagram_mentions, 
                        'instagram_engagement_rate': engagement_rate,
                        'instagram_posts': instagram_posts,
                        'instagram_data_collected': datetime.now(),
                        }})


if __name__ == "__main__":
    influencer = users.find_one({"_id": ObjectId(sys.argv[1])})
    
    insert_influencer_info(influencer)