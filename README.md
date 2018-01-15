# Ling073-Final

Welcome to the repo for my 3D Apertium Pairviewer! This project was made as a final for my Computation Linguistics class. The page is a simple way of visualizing the language pairs currently in Apertium (and also the language pairs worked on for the class).

## To Run:
Simply clone the repository. To run locally, I use a PythonHTTPServer:
```
python -m SimpleHTTPServer 8888 &
```
Then, you can direct your browser to <http://localhost:8888/> to view. 

To add or modify point data, change the apertiumPairs.json file.

## Files:
* apertium-languages.tsv -- This file contains the coordinates of certain languages in Apertium.

* apertiumPairs.json -- Contains all of the pair data and point data used

* index.html -- HTML and CSS

* languages.json -- Contains mappings from ISO language codes to full language names

* ling073Pairs.json -- Contains the data for only the pairs created in-class

* pairs.json.txt -- Contains the information used by the Apertium pairviewer

* pairviewer.js -- Body of the page

* places.json -- Example data that I used when starting out

* trimpairs.py -- Short Python script that scrapes the pairs.json.txt and the apertium-languages.tsv file. Creates a trimmed set of the Apertium data (only the language pairs that have coordinates in the tsv file). Writes the information to the apertiumPairs.json file

* world-110m.json -- Country data used for generating the globe

## Scraping Data For Pairs:
* First, run [this program](https://svn.code.sf.net/p/apertium/svn/trunk/apertium-tools/get_all_lang_pairs.py) in terminal.
```
$ python3 <path_to_file>/get_all_lang_pairs.py
```

* It should print a list of pairs in the console. This step might take a while (5-10 minutes maybe).
```
{'lg1': 'af', 'lg2': 'nl', 'last_updated': '2016-07-23', 'created': '2007-09-24', 'direction': '<>', 'repo': 'trunk', 'stems': 6263}
{'lg1': 'arg', 'lg2': 'cat', 'last_updated': '2017-10-27', 'created': '2016-01-04', 'direction': '<>', 'repo': 'trunk', 'stems': 24267}
{'lg1': 'bel', 'lg2': 'rus', 'last_updated': '2017-08-03', 'created': '2016-03-08', 'direction': '<>', 'repo': 'trunk', 'stems': 48880}
{'lg1': 'br', 'lg2': 'fr', 'last_updated': '2017-07-19', 'created': '2007-05-02', 'direction': '<>', 'repo': 'trunk', 'stems': 27998}
{'lg1': 'ca', 'lg2': 'it', 'last_updated': '2017-07-03', 'created': '2009-07-17', 'direction': '<>', 'repo': 'trunk', 'stems': 9772}
{'lg1': 'cat', 'lg2': 'srd', 'last_updated': '2017-10-28', 'created': '2010-10-28', 'direction': '<>', 'repo': 'trunk', 'stems': 36517}
{'lg1': 'crh', 'lg2': 'tur', 'last_updated': '2017-11-22', 'created': '2017-04-07', 'direction': '<>', 'repo': 'trunk', 'stems': 7082}
{'lg1': 'cy', 'lg2': 'en', 'last_updated': '2015-12-13', 'created': '2007-05-02', 'direction': '<>', 'repo': 'trunk', 'stems': 11608}
...
```

* Create a new file called `pairs.txt` and copy and paste the list of pairs into it.

* Run [this program](https://gist.github.com/JPJPJPOPOP/a5da0eac356662111973b35e7ea15e42) to format it the `pairs.txt` file. This should generate a new file `formattedpairs.txt` that contains the formatted pairs. Note: you should be running `formatpairs.py` in the same directory as `pairs.txt`.

* The next few steps assume that you have already cloned the repository.

* `cd` into your repository and copy and paste the formatted list from `formattedpairs.txt` into the `pairs.txt.json` file.

* Finally, still inside your repository, run the `trimpairs.py` program which will repopulate `apertiumPairs.json` and `apertiumPoints.json` with the new data.

## More:
To learn more about the project, you can look at the wiki page https://wikis.swarthmore.edu/ling073/User:Cpillsb1/Final_project

To learn more about Apertium, visit the Apertium website https://www.apertium.org/
