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


def k_means_init(k, points):
    centers = [];
    center_id = random.randint(0, len(points) - 1);
    centers_index = [];
    centers.append(points[center_id][:]);
    centers_index.append(center_id);

    for i in range(1, k):
        dis_sum = 0;
        dis_points_to_nearest_centers = [];
        for j in range(len(points)):
            dis = get_nearest_cluster_center(points[j], centers);
            dis_points_to_nearest_centers.append(dis);
            dis_sum += dis[0];
            
        rand_val = random.random() * dis_sum;

        best_index = 0;
        best_candidate = None;      
        for j in range(len(points)):
            if rand_val < dis_points_to_nearest_centers[j][0]:
                best_index = j;
                best_candidate = points[best_index];
                centers.append(best_candidate[:]);
                centers_index.append(best_index);
                break;
            rand_val -= dis_points_to_nearest_centers[j][0];
    return centers;


def get_distance_to_centers(point, centers):
    distances = [];
    for index, center in enumerate(centers):
        distance = get_euclidean_distances_sqr(center, point)
        distances.append( (distance, index) );
    distances = sorted(distances, key = lambda dist: dist[0]);
    return distances;


def get_nearest_cluster_center(point, centers):
    min_index = -1;
    min_dist = 1e100;
    for index, center in enumerate(centers):
        distance = get_euclidean_distances_sqr(center, point)
        if min_dist > distance:
            min_dist = distance;
            min_index = index
    return (min_dist, min_index)


def get_euclidean_distances_sqr(a, b):
    dis = 0;
    for i in range(len(a)):
        dis += (a[i] - b[i]) ** 2;
    return math.sqrt(dis);


def update_centers(k, points, centers, labels, size_of_clusters):
    len_vector = len(points[0]);
    for i in range(k):
        for j in range(len_vector):
            centers[i][j] = 0;
    size_of_clusters = [0] * k;
    for i, id in enumerate(labels):
        size_of_clusters[id] += 1;
        for j in range(len_vector):
            centers[id][j] += points[i][j];
    for i in range(k):
        # print("cluster", i, "size", size_of_clusters[i])
        for j in range(len_vector):
            centers[i][j] /= size_of_clusters[i];
    # print("==========");


# 限制大小的k_means
def k_means_iter(k, points, centers, labels, size_of_clusters):
    # print("constrainted", size_of_clusters)
    
    new_labels = assign_labels(k, points, centers, size_of_clusters);
    n_changed = 0;
    for i in range(len(points)):
        if new_labels[i] != labels[i]:
            n_changed += 1;
    for i in range(len(points)):
        labels[i] = new_labels[i];
    update_centers(k, points, centers, labels, size_of_clusters);
    # print("n_changed", n_changed)
    return n_changed;

def assign_labels(k, points, centers, size_of_clusters):
    labels = [-1] * len(points);
    heaps = []; #heap for each cluster
    for i in range(k):
        heaps.append([]);

    while sum([len(h) for h in heaps]) < len(points):
        sum_nodes = sum([len(h) for h in heaps])
        for p_id in range(len(points)):  #point_id
            if labels[p_id] >= 0:
                continue;
            dists = get_distance_to_centers(points[p_id], centers);
            for dist, c_id in dists:   #c_id: cluster_id
                if len(heaps[c_id]) < size_of_clusters[c_id]:  #如果未满，放入该cluster
                    heapq.heappush(heaps[c_id], (-dist, p_id) );
                    labels[p_id] = c_id;
                    break;
                else:  #如果满了，先看是否能替换掉该类中的其他点，否则查找第二、三...顺位的cluster
                    farest_dist, farest_id = heapq.nsmallest(1, heaps[c_id])[0];
                    if -dist > farest_dist:  #replace the farest point
                        heapq.heappop(heaps[c_id]);
                        labels[farest_id] = -1;
                        heapq.heappush(heaps[c_id], (-dist, p_id));
                        labels[p_id] = c_id;
                        break;
    # print("labels", labels)
    return labels;
        

def k_means(k, points):
    n_data = len(points);
    n_large_size = n_data - k * math.floor(n_data / k);
    size_of_clusters = [math.ceil(n_data / k)] * n_large_size + [math.floor(n_data / k)] * (k - n_large_size);

    centers = k_means_init(k, points);
    labels = [-1] * n_data;
    n_changed = 1;
    while n_changed > 0:
        n_changed = k_means_iter(k, points, centers, labels, size_of_clusters);
        break;
    print(labels)

if __name__ == '__main__':
    # database localhost 27017 textsystem data_56c48bb5b7a70b20892ffa29 text 7;
    # points 3 "[[1,2],[2,3],[3,4]]";
    if (sys.argv[1] == "database"):
        data, docs, matrix = load_data(sys.argv[2], int(sys.argv[3]), sys.argv[4], sys.argv[5], sys.argv[6]);
        k = int(sys.argv[7]);
        k_means(k, matrix);
    if (sys.argv[1] == "points"):
        k = int(sys.argv[2]);
        matrix = json.loads(sys.argv[3]);
        k_means(k, matrix);

