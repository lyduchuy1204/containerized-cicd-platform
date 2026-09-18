import base64
import json
import os
import sys
import urllib.error
import urllib.parse
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
URL = os.environ.get("JENKINS_URL", "http://127.0.0.1").rstrip("/")
USER = os.environ.get("JENKINS_USER", "")
TOKEN = os.environ.get("JENKINS_TOKEN", "")
REPO = os.environ.get("PLATFORM_LIB_REPO", "https://github.com/lyduchuy1204/containerized-cicd-platform.git")
BRANCH = os.environ.get("PLATFORM_LIB_VERSION", "main")

JOBS = [
    ("platform-validate", "Jenkinsfile", "Platform gate: lint pipelines, render overlays, server dry run."),
    ("product-media-ci", "projects/product-media/ci.Jenkinsfile", "Build and push images for product-media."),
    ("product-media-cd", "projects/product-media/cd.Jenkinsfile", "Deploy one environment of product-media."),
    ("product-media-promote", "projects/product-media/promote.Jenkinsfile", "Move a pointer tag for product-media."),
]

CONFIG = """<?xml version='1.1' encoding='UTF-8'?>
<flow-definition plugin="workflow-job">
  <description>{description}</description>
  <keepDependencies>false</keepDependencies>
  <properties/>
  <definition class="org.jenkinsci.plugins.workflow.cps.CpsScmFlowDefinition" plugin="workflow-cps">
    <scm class="hudson.plugins.git.GitSCM" plugin="git">
      <configVersion>2</configVersion>
      <userRemoteConfigs>
        <hudson.plugins.git.UserRemoteConfig>
          <url>{repo}</url>
        </hudson.plugins.git.UserRemoteConfig>
      </userRemoteConfigs>
      <branches>
        <hudson.plugins.git.BranchSpec>
          <name>*/{branch}</name>
        </hudson.plugins.git.BranchSpec>
      </branches>
      <doGenerateSubmoduleConfigurations>false</doGenerateSubmoduleConfigurations>
      <submoduleCfg class="empty-list"/>
      <extensions/>
    </scm>
    <scriptPath>{script}</scriptPath>
    <lightweight>false</lightweight>
  </definition>
  <triggers/>
  <disabled>false</disabled>
</flow-definition>
"""


def call(path, data=None, content_type=None):
    if not USER or not TOKEN:
        sys.exit("can JENKINS_USER va JENKINS_TOKEN")
    auth = base64.b64encode(f"{USER}:{TOKEN}".encode()).decode()
    request = urllib.request.Request(URL + path, data=data)
    request.add_header("Authorization", "Basic " + auth)
    if content_type:
        request.add_header("Content-Type", content_type)
    try:
        with urllib.request.urlopen(request, timeout=60) as response:
            return response.status, response.read().decode(errors="replace")
    except urllib.error.HTTPError as error:
        return error.code, error.read().decode(errors="replace")


def whoami():
    status, body = call("/whoAmI/api/json")
    if status != 200:
        print(f"auth that bai, http {status}")
        print(body[:300])
        return False
    data = json.loads(body)
    print(f"whoAmI: {data.get('name')} | authenticated={data.get('authenticated')}")
    return True


def existing():
    status, body = call("/api/json?tree=jobs[name]")
    if status != 200:
        return []
    return [job["name"] for job in json.loads(body).get("jobs", [])]


def build(name, params=None):
    query = ""
    endpoint = f"/job/{urllib.parse.quote(name)}/build"
    if params:
        endpoint = f"/job/{urllib.parse.quote(name)}/buildWithParameters"
        query = "?" + urllib.parse.urlencode(params)
    status, body = call(endpoint + query, data=b"")
    print(f"trigger {name}: http {status}")
    return status in (200, 201, 302)


def result(name, number="lastBuild"):
    status, body = call(f"/job/{urllib.parse.quote(name)}/{number}/api/json?tree=number,result,building,displayName")
    if status != 200:
        print(f"  chua co build nao ({status})")
        return None
    data = json.loads(body)
    print(f"  build #{data['number']} {data.get('displayName', '')}: "
          f"building={data['building']} result={data.get('result')}")
    return data


def console(name, number="lastBuild", tail=60):
    status, body = call(f"/job/{urllib.parse.quote(name)}/{number}/consoleText")
    if status != 200:
        print(f"  khong lay duoc log ({status})")
        return
    lines = body.rstrip().split("\n")
    for line in lines[-tail:]:
        print("  " + line)


def create():
    present = existing()
    for name, script, description in JOBS:
        body = CONFIG.format(description=description, repo=REPO, branch=BRANCH, script=script).encode()
        if name in present:
            status, response = call(f"/job/{name}/config.xml", data=body, content_type="application/xml")
            action = "cap nhat"
        else:
            status, response = call(f"/createItem?name={urllib.parse.quote(name)}", data=body,
                                    content_type="application/xml")
            action = "tao moi"
        mark = "OK  " if status in (200, 302) else "FAIL"
        print(f"{mark} {action} {name}  (http {status})  scriptPath={script}")
        if status not in (200, 302):
            print("      " + response.strip().split("\n")[0][:200])


def show():
    for name in existing():
        status, body = call(f"/job/{urllib.parse.quote(name)}/api/json?tree=name,description")
        if status == 200:
            data = json.loads(body)
            print(f"  {data['name']}: {data.get('description', '')}")
        else:
            print(f"  {name}")


def main():
    action = sys.argv[1] if len(sys.argv) > 1 else "whoami"

    if action == "whoami":
        if whoami():
            print("job hien co:")
            show()
        return 0

    if action == "create":
        if not whoami():
            return 1
        create()
        return 0

    if action == "list":
        show()
        return 0

    if action == "build":
        name = sys.argv[2]
        params = dict(pair.split("=", 1) for pair in sys.argv[3:])
        return 0 if build(name, params) else 1

    if action == "result":
        result(sys.argv[2], sys.argv[3] if len(sys.argv) > 3 else "lastBuild")
        return 0

    if action == "log":
        console(sys.argv[2], sys.argv[3] if len(sys.argv) > 3 else "lastBuild")
        return 0

    sys.exit(f"lenh khong biet: {action}. Dung whoami, create, list, build, result, log")


if __name__ == "__main__":
    sys.exit(main())
