#!/usr/bin/env Python
# coding=utf-8

import sys
import urllib
import time
import random
import json
import chardet
from pyquery import PyQuery as pq

def querySinaPage(url):
    print(url)
    try:
        page_src_string = urllib.request.urlopen(url).read()
        charset = chardet.detect(page_src_string)["encoding"]

        if(charset == "utf-8"):
            html = pq(url, encoding="utf-8")
        else:
            html = pq(url, encoding="gbk")
        text = html(".article p").remove(".article-editor").text().encode('latin1').decode('utf8')
        text = "".join(text.split())
        # keywords = html(".article-keywords a").text().encode("latin1").decode("utf-8", errors="replace")
        # keywords = " ".join(keywords.split())
        return text
    except urllib.error.HTTPError as err:
        print("httperror: ", err)
        return " "
    except Exception as err:
        print("error: ", err)
        text = html(".article p").remove(".article-editor").text()
        return text

def query163Page(url):
    print(url)
    try:
        page_src_string = urllib.request.urlopen(url).read()
        charset = chardet.detect(page_src_string)["encoding"]
        if(charset == "utf-8"):
            html = pq(url, encoding="utf-8")
        else:
            html = pq(url, encoding="gbk")

        text = html(".post_text p").remove("style").text()
        text = " ".join(text.split())
        return text
    except urllib.error.HTTPError as err:
        print("httperror: ", err)
        return " "


def querySohuPage(url):
    print(url)
    try:
        page_src_string = urllib.request.urlopen(url).read()
        charset = chardet.detect(page_src_string)["encoding"]
        if (charset == "utf-8"):
            html = pq(url, encoding="utf-8")
        else:
            html = pq(url, encoding="gbk")

        text = html(".article p").remove(".backword").text()
        text = " ".join(text.split())
        return text
    except urllib.error.HTTPError as err:
        print("httperror: ", err)
        return " "

def queryCctvPage(url):
    print(url)
    try:
        page_src_string = urllib.request.urlopen(url).read()
        charset = chardet.detect(page_src_string)["encoding"]
        if (charset == "utf-8"):
            html = pq(url, encoding="utf-8")
        else:
            html = pq(url, encoding="gbk")

        text = html(".cnt_bd").remove("h1").remove(".o-tit").remove(".function").remove("script").text().encode("latin1", 'ignore').decode("utf-8", errors="replace")
        text = " ".join(text.split())

        return text
    except urllib.error.HTTPError as err:
        print("httperror: ", err)
        return " "
    except Exception as err:
        print("error: ", err)
        text = html(".cnt_bd").remove("h1").remove(".o-tit").remove(".function").remove("script").text()
        return text


def sitesType(site, url):
    return {
        "163.com": query163Page,
        "sina.com.cn": querySinaPage,
        "sohu.com": querySohuPage,
        "cctv.com": queryCctvPage,
    }.get(site, "")(url)


def queryBaiduPage(site, url):

    urlMap = {}
    dataList = []
    html = pq(url=url)
    resultEles = html(".result")
    for i in range(0, len(resultEles)):
        newsUrl = resultEles.eq(i)(".c-title a").attr("href")
        if(newsUrl[7:12] != "video"):
            title = resultEles.eq(i)(".c-title").text().replace(" ", "")
            if not newsUrl in urlMap:
                urlMap[newsUrl] = True

                abstractEle = resultEles.eq(i)(".c-summary")
                authorTimeEle = abstractEle(".c-author")

                abstractEle.remove(".c-author")
                abstractEle.remove(".c-info")
                abstract = abstractEle.text().replace(" ", "")

                authorTimeText = authorTimeEle.text()
                nonBreakSpace = u'\xa0'
                splitted = authorTimeText.split(nonBreakSpace)
                newsSite = splitted[0]
                timeStr = splitted[2]

                if (timeStr.find(u"前") >= 0):
                    hour = int(timeStr.replace(u"小时前", ""))
                    timeStamp = int(time.time()) - hour * 3600
                else:
                    timeStamp = int(time.mktime(time.strptime(timeStr, u"%Y年%m月%d日 %H:%M")))

                text = sitesType(site, newsUrl)
                if text == "":
                    text = title + " " + abstract

                data = {
                    "title": title,
                    "url": newsUrl,
                    "abstract": abstract,
                    "text": text,
                    "site": newsSite,
                    "time": timeStamp * 1000
                }
                dataList.append(data)

    return dataList


def crawl(word, pageNum, sites):
    DataList = []
    for site in sites:
        # print(site)
        query = "site:" + site + " title:" + word
        start = 0
        while start < int(pageNum):
            url = "http://news.baidu.com/ns?tn=news&ie=utf-8&clk=sortbytime&rn=50&word=" + query + "&pn=" + str(start)
            print("url", url)
            dataList = queryBaiduPage(site, url)
            DataList.extend(dataList)
            start = start + 50
            print("start:", start)
            time.sleep(round(random.random() * 2))

    return DataList

# python3 ecrawlerNews.py filePath word pageNum sites
if __name__ == "__main__":
    # word = "e租宝"
    # sites = ["sina.com.cn", "163.com", "cctv.com", "sohu.com"]
    # sites = ["sina.com.cn"]
    # filePath = './data/e租宝.json'
    filePath = sys.argv[1]
    word = sys.argv[2]
    pageNum = sys.argv[3]
    sites = sys.argv[4: ]

    print(word, sites)

    outputFile = open(filePath, "w", encoding="utf-8")

    start = time.time()

    dataList = []
    dataList = crawl(word, pageNum, sites)
    print(len(dataList))
    jsonData = json.dumps(dataList, ensure_ascii=False)
    outputFile.write(jsonData)

    end = time.time()
    print(end - start)

    outputFile.close()