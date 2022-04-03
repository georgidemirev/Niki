from pymongo import MongoClient

DB_CONNECTION_STRING = (
    "mongodb://admin:prJZiti2GSAyiCdKpirx7fDLTOW2w63e@167.71.61.2:27017"
)
db_client = MongoClient(DB_CONNECTION_STRING)
