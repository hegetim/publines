<!--- SPDX-FileCopyrightText: 2024 Tim Hegemann <hegemann@informatik.uni-wuerzburg.de>
      SPDX-License-Identifier: CC-BY-SA-4.0
--->
Publines
========

Visualize joint publications with your coauthors.  Storyline visualizations show
interactions between a given set of characters over time.  Each character is
represented by an *x*-monotone curve.  A meeting among characters requires the
corresponding curves to form a continuous block.  Therefore, character curves may
have to cross each other.

Publines uses data from [dblp.org](https://dblp.org/) to build storylines where
the characters are authors and the meetings are joint publications.  We are
especially interested in visualizing a group of colleagues centered around an
author, the protagonist, who participates in all selected publications.

Play with our [demo instance](https://publines.github.io).


Host Your Own Instance
----------------------

Publines is a React webapp written in TypeScript and provides a webpack build
script.  When building it yourself the only prerequisite is npm.

Download the repository and run

```
npm install
```

in order to download the required dependencies.

Then run
```
npm run build
```

to create a production build.

The resulting artifacts can be found in the `./build` directory.  You may host
these locally for testing for example using the python webserver:

```
cd ./build
python3 -m http.server
```


Configure the Imprint
---------------------

The publines website shows a small imprint banner at the bottom of the page.
You can customize this by providing an `imprint.csv` file at the top level
of your publines distribution.  Every entry in the imprint banner is a triple
of an optional logo url, some text, and an optional link target:

```
./path/to/my/logo.svg,Example Organization,https://example.org
,additional notes (not a link),
```


Publication
-----------

Most of the algorithms are described in an upcoming publication at GD2024.


Contributors
------------

This library has been developed by the [algorithms and complexity group](https://www.informatik.uni-wuerzburg.de/algo/team/),
University of Würzburg, Germany.

For contact, you can write an email to ``hegemann *at* informatik *dot* uni-wuerzburg *dot* de``.


