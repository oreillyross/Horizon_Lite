This is the schema intelligence hierarchy
Theme
 └── Scenario
      └── Indicator
           └── Snippet
                └── Source URL
                └── Publication
                └── Timestamp
                └── Analyst confidence
                └── Extracted entities

So once I have defined a Theme, then I should be able to add scenarios per theme. These can be realistic and competing themes, then every theme can also have several indicators, each indicator has a strength, time weight and a decay. 

These are already built in the system: The built screens end when you see this == END already built == later on

1. Theme CRUD

Simple.

2. Scenario CRUD

Simple.

3. Indicator CRUD

Include:

strength
decay
weighting

== END already built ==

The next step would be to run twice a day an automated GDELT pull, and ingestion. The system should have a screen which has pre-filtered the list of GDELT events with a hyperlink stored. In this screen should be the ability to a one pass review and mark gdelt events as flagged or for further review. 

5. Analyst review screen

MOST IMPORTANT SCREEN.

Clean workflow:

article text
select text
create snippet
attach indicator

This is the heart of the system.

The second screen is a screen which shows the flagged items and as an analyst when I click on the entry it should take the url, parse the content, remve images and only show the actual text content in the webcut view where I can easily select text and a popup window allows one to create snippet.

6. Snippet storage

Store:

exact quote
source url
timestamp
linked indicator
analyst notes

Using ML inference it automatically suggests the indicator to add it to. this can be manually overidden but it is also easily able to just accept suggestion and move on to next copy paste event, statement etc.

The stored snippet should store the original url reference, and any other required metadata to later review the scenario. 

The synopsis for the theme takes all the events linked by scenario and does a LLM summary, as before.
But with this added for LLM.
LLM has:

structured evidence
weighted indicators
temporal context
competing scenarios

DO NOT BUILD

- vector graphs
- autonomous agents
- knowledge graphs
- advanced Bayesian engines
- real-time pipelines
 - automated inference systems

I repeat DO NOT Build the above.