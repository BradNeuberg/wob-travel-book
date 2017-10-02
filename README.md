mkvirtualenv scripts
workon scripts

pip install -r requirements.txt

python ./src/scripts/download_qpx.py --api_key=<INSERT QPX KEY HERE>