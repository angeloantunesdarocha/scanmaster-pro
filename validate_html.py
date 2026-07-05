from html.parser import HTMLParser
from pathlib import Path
import sys

class HTMLStructureChecker(HTMLParser):
    void_tags = {'area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input', 'link', 'meta', 'param', 'source', 'track', 'wbr'}

    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.stack = []
        self.errors = []

    def handle_starttag(self, tag, attrs):
        if tag.lower() not in self.void_tags:
            self.stack.append((tag.lower(), self.getpos()))

    def handle_startendtag(self, tag, attrs):
        pass

    def handle_endtag(self, tag):
        tag = tag.lower()
        if tag in self.void_tags:
            return
        if not self.stack:
            self.errors.append(f'Unmatched closing tag </{tag}> at line {self.getpos()[0]} column {self.getpos()[1]}')
            return
        for i in range(len(self.stack) - 1, -1, -1):
            if self.stack[i][0] == tag:
                self.stack = self.stack[:i]
                return
        self.errors.append(f'Unexpected closing tag </{tag}> at line {self.getpos()[0]} column {self.getpos()[1]}')

    def error(self, message):
        self.errors.append(f'Parser error: {message}')


if __name__ == '__main__':
    path = Path('index.html')
    if not path.exists():
        print('index.html not found in current directory.')
        sys.exit(1)

    html = path.read_text(encoding='utf-8')
    parser = HTMLStructureChecker()
    parser.feed(html)
    parser.close()

    if parser.stack:
        for tag, pos in parser.stack:
            parser.errors.append(f'Unclosed tag <{tag}> opened at line {pos[0]} column {pos[1]}')

    if parser.errors:
        print('HTML structure validation found issues:')
        for err in parser.errors:
            print(f'- {err}')
        sys.exit(1)

    print('HTML structure is valid according to the basic parser check.')
