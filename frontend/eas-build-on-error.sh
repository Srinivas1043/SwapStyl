#!/usr/bin/env bash
echo "--- EAS BUILD ERROR LOGS ---"
cat /home/expo/workingdir/build/logs/build-*.log
cat /home/expo/workingdir/build/android/app/build/reports/errors/*.txt
cat /home/expo/workingdir/build/android/app/build/reports/profile/*.html
echo "--- END EAS BUILD ERROR LOGS ---"
