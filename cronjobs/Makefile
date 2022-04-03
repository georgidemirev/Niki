.PHONY: setup test lint clean clean-build clean-pyc clean-test

setup: requirements.txt
	pip3 install -r requirements.txt

test: requirements.txt
	pip3 install -r requirements.txt
	pytest tests

lint: 
	pylint src

type-annotations:
	mypy src
	
format: 
	black src
	black tests
	isort .

clean: clean-build clean-pyc clean-test

clean-build:
	rm -fr build/
	rm -fr dist/
	rm -fr .eggs/
	find . -name '*.egg-info' -exec rm -fr {} +
	find . -name '*.egg' -exec rm -f {} +

clean-pyc:
	find . -name '*.pyc' -exec rm -f {} +
	find . -name '*.pyo' -exec rm -f {} +
	find . -name '*~' -exec rm -f {} +
	find . -name '__pycache__' -exec rm -fr {} +

clean-test:
	rm -f tests/.coverage
	rm -rf tests/htmlcov/
	rm -rf tests/.pytest_cache/
	rm -rf .pytest_cache
