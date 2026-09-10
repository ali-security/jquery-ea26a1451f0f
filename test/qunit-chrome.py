"""Run the jQuery QUnit suite in headless Chrome and fail the build on any failed test."""
import sys, time, re
from selenium import webdriver
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.common.by import By

url = sys.argv[1]
timeout = int(sys.argv[2]) if len(sys.argv) > 2 else 900

opts = Options()
for flag in ("--headless=new", "--no-sandbox", "--disable-gpu", "--disable-dev-shm-usage",
             "--window-size=1280,1024", "--disable-background-timer-throttling",
             "--disable-backgrounding-occluded-windows", "--disable-renderer-backgrounding"):
    opts.add_argument(flag)
driver = webdriver.Chrome(options=opts)
try:
    driver.get(url)
    deadline = time.time() + timeout
    text = ""
    while time.time() < deadline:
        try:
            text = driver.find_element(By.ID, "qunit-testresult").text
        except Exception:
            text = ""
        if "completed" in text:
            break
        time.sleep(2)
    else:
        print("FATAL: QUnit did not finish within %ds" % timeout)
        sys.exit(1)
    print("QUNIT RESULT: " + text.replace("\n", " "))
    failures = []
    for li in driver.find_elements(By.CSS_SELECTOR, "#qunit-tests > li"):
        if "fail" not in (li.get_attribute("class") or ""):
            continue
        try:
            module = li.find_element(By.CSS_SELECTOR, ".module-name").text
        except Exception:
            module = ""
        name = li.find_element(By.CSS_SELECTOR, ".test-name").text
        msgs = [m.text for m in li.find_elements(By.CSS_SELECTOR, "li.fail .test-message")][:5]
        failures.append("%s: %s\n      >> %s" % (module, name, "\n      >> ".join(msgs)))
    if failures:
        print("FAILED TESTS (%d):" % len(failures))
        for f in failures:
            print("  - " + f)
        sys.exit(1)
    m = re.search(r"(\d+) assertions? of (\d+) passed", text)
    if not m or m.group(1) != m.group(2):
        print("FATAL: assertion counts do not agree with a clean run")
        sys.exit(1)
    print("All QUnit tests passed.")
finally:
    driver.quit()
