#! /usr/bin/env python3

import re;
import json;
import time;
import random;
import pymongo;
import toolz;
import math;
import heapq;
import sys;
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.cluster import AgglomerativeClustering

def load_data(db_host, db_port, db_name, db_collection, text_field):
    mongodb = pymongo.MongoClient(db_host, db_port)
    db = mongodb[db_name];
    collection = db[db_collection];

    data = collection.find({});
    data = [d for d in data];
    # sessions = [d["session"] for d in data];
    # titles = [d["title"] for d in data];
    docs = [d["_segmentation"] for d in data];

    vectorizer = TfidfVectorizer(min_df=1)
    vectors = vectorizer.fit_transform(docs)

    matrix = vectors.toarray();
    return (data, docs, matrix);


def clustering(k, points):




if __name__ == '__main__':
    # database localhost 27017 textsystem data_56c48bb5b7a70b20892ffa29 text 7;
    # points 3 "[[1,2],[2,3],[3,4]]";
    if (sys.argv[1] == "database"):
        data, docs, matrix = load_data(sys.argv[2], int(sys.argv[3]), sys.argv[4], sys.argv[5], sys.argv[6]);
        k = int(sys.argv[7]);
        clustering(k, matrix);
    if (sys.argv[1] == "points"):
        k = int(sys.argv[2]);
        matrix = json.loads(sys.argv[3]);
        clustering(k, matrix);

