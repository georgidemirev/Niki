import random
from datetime import datetime
from typing import Dict, List, Set

from common.db.client import db_client

users = db_client["influ-ai"].users
scrapped_influencers = db_client["influ-ai"].influencers
campaigns = db_client["influ-ai"].campaigns
revokes = db_client["influ-ai"].revokes
logs = db_client["influ-ai"].logs


def get_influencers() -> List[Dict]:
    influencers = users.find({"role": "influencer"})
    return influencers


def get_all_campaigns() -> List[Dict]:
    all_campaigns = campaigns.find()
    return all_campaigns


def get_ongoing_campaigns() -> List[Dict]:
    today = datetime.today()
    ongoing_campaigns_handler = campaigns.find(
        {"$and": [{"start_date": {"$lte": today}}, {"end_date": {"$gte": today}}]}
    )
    ongoing_campaigns = []
    for campaign in ongoing_campaigns_handler:
        ongoing_campaigns.append(campaign)
    return ongoing_campaigns


def get_influencers_to_ongoing_campaigns() -> Dict[Dict, Dict]:
    influencer_to_campaign = {}
    ongoing_campaigns = get_ongoing_campaigns()
    for campaign in ongoing_campaigns:
        influencers_in_campaign = [
            influencer["email"] for influencer in campaign["influencers"]
        ]
        influencers = get_influencers()
        for influencer in influencers:
            if influencer["email"] in influencers_in_campaign:
                influencer_to_campaign[influencer] = campaign
    return influencer_to_campaign


def get_not_connected_influencers() -> List[Dict]:
    influencers = users.find(
        {
            "role": "influencer",
            "fbgraph_token": {"$in": [None, ""]},
        },
    ).sort("instagram_total_followers", -1)
    return influencers


def get_user_for_business_discovery_requests() -> Dict:
    emails = ["l.mladenov21@gmail.com", "vlazzarova@yahoo.bg", "elizabethfame@abv.bg"]
    valid_users = []
    for user in users.find({"email": {"$in": emails}}):
        if "fbgraph_token" in user and "instagram_id" in user:
            valid_users.append(user)

    user = random.choice(valid_users)
    return user


def get_businesses() -> Set[str]:
    business_accounts = scrapped_influencers.find({"business": True})
    business_usernames = set()
    for business_account in business_accounts:
        business_usernames.add(business_account["username"])
    return business_usernames


def insert_revoke(influencer: Dict, reason: str) -> None:
    revoke = {
        "name": influencer["name"],
        "email": influencer["email"],
        "reason": reason,
        "fbgraph_token": influencer["fbgraph_token"],
        "user_id": influencer["_id"],
    }
    revokes.insert_one(revoke)


def remove_fb_graph_token(influencer: Dict) -> None:
    users.update_one({"_id": influencer["_id"]}, {"$unset": {"fbgraph_token": 1}})
    users.update_one(
        {"_id": influencer["_id"]}, {"$unset": {"fbgraph_token_expiry": 1}}
    )
