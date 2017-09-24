#-*-coding=utf-8 -*-

import os
import sys

def readData(filePath):
    pfile = open(filePath, 'r')
    data = ''

    for line in pfile.readlines():
        data += line
    pfile.close()
    return data[1:len(data)-1]

def writeData(filePath, data):
    pfile = open(filePath, 'w')
    pfile.write(data)
    pfile.close()


if __name__ == '__main__':
    pathDir = sys.argv[1]
    distFile = sys.argv[2]
    files = os.listdir(pathDir)
    data = '['

    for file in files:
        if(file != '.DS_Store'):
            filePath = pathDir + '/' + file
            data += readData(filePath)
            data += ','

    data = (data[0:len(data)-1] + ']')
    
    writeData(distFile, data)

    print("finished!")