BUILD_DIR = build
MINJAR = java -jar ${BUILD_DIR}/google-compiler-20091218.jar

SOURCES = jquery.svganim.js jquery.svgfilter.js jquery.svg.js jquery.svgplot.js \
	  jquery.svgdom.js jquery.svggraph.js jquery.svg.compat-1.0.1.js
MINFILES = ${patsubst %.js,%.min.js,$(SOURCES)}

all: min

min: $(MINFILES)

%.min.js: %.js
	@@echo "Minimizing $< to $@"
	${MINJAR} --js $< --warning_level QUIET > $@

