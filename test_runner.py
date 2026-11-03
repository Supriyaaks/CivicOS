import subprocess
import time
import os
import sys

def main():
    p = subprocess.Popen(['node', 'dist/src/index.js'], cwd=r'backend\backend', stdout=subprocess.PIPE, stderr=subprocess.PIPE)
    time.sleep(2)
    try:
        import CivicOS.test_person4_all_modules as tester
        tester.run_tests()
    finally:
        p.terminate()

if __name__ == '__main__':
    main()
