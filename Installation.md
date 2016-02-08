To Install Ogar Unlimited, you need [Node.js](nodejs.org)

(To install Node.js for linux simply do this `curl -sL https://deb.nodesource.com/setup_4.x | sudo -E bash -
sudo apt-get install -y nodes` Then do this `sudo apt-get install -y build-essential`)

(You can install and use Ogar unlimited on windows very quickly. First click `InstallWS.bat` in src. then wait (it takes awhile) then click `ClickToStart.bat` and your off! the next time you start the server, you only have to click `ClickToStart.bat`)

(If you want to control your server from different locations, use SSH)

First download the repository and unzip it or do `git clone https://github.com/AJS-development/Ogar-unlimited.git`

Then locate the folder `Ogar-unlimited` by using `cd [directorypath]` in commandprompt/terminal

Do `npm install` to install ws ( a needed plugin )

Then `cd` it to `Ogar-unlimited/src`

Type in `sudo node index.js` It might require your password. (Note: this will not work if you are not using a root/administrator user)

Then connect by typing `agar.io/?ip=localhost:443`

If you want to connect with your friends, you need to port forward

P.s. did you know you can go to your server in iOS? To do that, go to the agar.io/?=yourip website on safari then click do not open in App Store. Then go to the upload button next to the url input and click request desktop site.


(Installation for Linux)
```
pi@andrewserver:~ $ git clone https://github.com/AJS-development/Ogar-unlimited.git
Cloning into 'Ogar-unlimited'...
remote: Counting objects: 2884, done.
remote: Compressing objects: 100% (45/45), done.
remote: Total 2884 (delta 24), reused 0 (delta 0), pack-reused 2839
Receiving objects: 100% (2884/2884), 399.91 KiB | 0 bytes/s, done.
Resolving deltas: 100% (2099/2099), done.
Checking connectivity... done.
pi@andrewserver:~ $ cd ~/Ogar-unlimited/src
pi@andrewserver:~/Ogar-unlimited/src $ npm install
^[[A^[[Bnpm WARN package.json Ogar@1.0.0 license should be a valid SPDX license expression
ws@1.0.1 ../node_modules/ws
├── options@0.0.6
└── ultron@1.0.2
pi@andrewserver:~/Ogar-unlimited/src $ sudo node index.js
                                        _ _       _              _
                                       | (_)     (_)_           | |
  ___   ____  ____  ____    _   _ ____ | |_ ____  _| |_  ____ _ | |
 / _ \ / _  |/ _  |/ ___)  | | | |  _ \| | |    \| |  _)/ _  ) || |
| |_| ( ( | ( ( | | |      | |_| | | | | | | | | | | |_( (/ ( (_| |
 \___/ \_|| |\_||_|_|       \____|_| |_|_|_|_|_|_|_|\___)____)____|
      (_____|
[Game] Ogar Unlimited - An open source Agar.io server implementation
[Game] By The AJS development team
[Game] Loaded stats server on port 88
[Game] Listening on port 443
[Game] Current game mode is Free For All
[Autopause] The Game Was Paused to save memory. Join the game to resume!
>
```
