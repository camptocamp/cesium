#!/usr/bin/env python2

# pygdal does not work (compilation issue, so we are calling it directly)
from subprocess import Popen, PIPE
import StringIO
import string
import json
import os

# Feature Count: 2632
# Extent: (2655000.000000, 1299000.000000) - (2659375.000000, 1302000.000000)

feature_count_prefix = 'Feature Count: '
extent_prefix = 'Extent: '

def extract_shp_infos(filename):
    args = ['ogrinfo', '-ro', '-so', '-al', '/var/local/geodata/bund/swisstopo/terrain_3D/DTM_2018/Shape/8/' + filename]
    process = Popen(args, stdout=PIPE, stderr=PIPE)
    stdout = process.communicate()[0].decode('utf-8').strip()
    reader = StringIO.StringIO(stdout)
    
    output = {
      'filename': filename
    }
    print(filename)
    for line in reader.readlines():
        if line.startswith(feature_count_prefix):
            count = int(line[len(feature_count_prefix):])
            output['count'] = count
            print(count)
        elif line.startswith(extent_prefix):
            sub = line[len(extent_prefix):-1]
            extent = sub.replace(') - (', ', ').replace('(', '[').replace(')', ']')
            output['extent'] = extent
            print(extent)
    reader.close()
    return output


with open('./shp_infos', 'wt') as f:
    filenames = filter(lambda p : p.endswith('.shp'), os.listdir('/var/local/geodata/bund/swisstopo/terrain_3D/DTM_2018/Shape/8/'))
    for filename in filenames:
        output = json.dumps(extract_shp_infos(filename))
        print(output)
        f.write(output)
        f.write(",\n")

