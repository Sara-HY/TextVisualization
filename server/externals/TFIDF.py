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
from sklearn.cluster import KMeans
import numpy as np
np.set_printoptions(threshold=np.inf)

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

    matrix = vectors.toarray().tolist();
    return (data, docs, matrix);


if __name__ == '__main__':
    data, docs, matrix = load_data(sys.argv[1], int(sys.argv[2]), sys.argv[3], sys.argv[4], sys.argv[5]);
    print(json.dumps(matrix))