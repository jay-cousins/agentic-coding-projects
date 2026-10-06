# Empty on purpose: its presence makes pytest add this directory (EXA/) to
# sys.path in prepend import mode, so `tests/test_web_scrape_source.py` can
# `import web_scrape_source` without the project needing a package layout.
