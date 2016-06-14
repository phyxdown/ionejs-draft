BROWSERIFY=browserify

APPJS=app.js
SRCJS=main.js
MOD=node_modules

default: all
.DEFAULT:

all: $(APPJS)
.PHONY: all

$(APPJS): $(SRCJS) $(MOD)
	$(BROWSERIFY) $(SRCJS) -o $(APPJS)
	python -m SimpleHTTPServer
.PHONY: $(APPJS)

$(MOD): package.json
	npm install

clean:
	rm -rf $(APPJS)
