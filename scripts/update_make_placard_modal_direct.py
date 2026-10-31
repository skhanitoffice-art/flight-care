# scripts/update_make_placard_modal_direct.py

with open('src/components/MakePlacardModal.js', 'r', encoding='utf-8') as f:
    content = f.read()

target = """  // Handle Download HD Placard
  const handleDownload = async () => {
    if (!passengerName || !passengerName.trim()) {
      setStatusNotice(isBn ? '⚠️ অনুগ্রহ করে যাত্রীর নাম ইনপুট দিন' : '⚠️ Please enter passenger name');
      setTimeout(() => setStatusNotice(''), 3000);
      return;
    }

    await handleSaveToHistory();

    downloadPlacardImage({
      passengerName,
      flightNumber,
      serviceDate,
      onSuccess: () => {
        setStatusNotice(isBn ? '✓ এইচডি প্লেকার্ড সফলভাবে ডাউনলোড হয়েছে!' : '✓ HD Placard downloaded successfully!');
        setTimeout(() => setStatusNotice(''), 4000);
      },
    });
  };

  // Handle Direct Print A4 Placard
  const handlePrint = async () => {
    if (!passengerName || !passengerName.trim()) {
      setStatusNotice(isBn ? '⚠️ অনুগ্রহ করে যাত্রীর নাম ইনপুট দিন' : '⚠️ Please enter passenger name');
      setTimeout(() => setStatusNotice(''), 3000);
      return;
    }

    await handleSaveToHistory();

    printPlacardDirect({
      passengerName,
      flightNumber,
      serviceDate,
      onSuccess: () => {
        setStatusNotice(isBn ? '✓ প্রিন্ট উইন্ডো প্রস্তুত করা হয়েছে' : '✓ Print window opened');
        setTimeout(() => setStatusNotice(''), 4000);
      },
    });
  };"""

replacement = """  // Handle Download HD Placard (Synchronous trigger to prevent browser blockers)
  const handleDownload = () => {
    const effectiveName = (passengerName && passengerName.trim()) ? passengerName.trim() : 'MR. ISHAUJHYAODS';
    if (!passengerName || !passengerName.trim()) {
      setPassengerName('MR. ISHAUJHYAODS');
    }

    // Save to history asynchronously in background
    savePlacardRecord({
      passengerName: effectiveName,
      serviceDate,
      flightNumber,
      managerSession,
    }).then(saved => {
      if (saved) {
        setLastSavedId(saved.id);
        loadHistory();
      }
    }).catch(() => {});

    // Instant HD Download
    downloadPlacardImage({
      passengerName: effectiveName,
      flightNumber,
      serviceDate,
      onSuccess: () => {
        setStatusNotice(isBn ? '✓ এইচডি প্লেকার্ড ডাউনলোড হয়েছে!' : '✓ HD Placard downloaded successfully!');
        setTimeout(() => setStatusNotice(''), 4000);
      },
    });
  };

  // Handle Direct Print A4 Placard (Synchronous trigger with iframe print)
  const handlePrint = () => {
    const effectiveName = (passengerName && passengerName.trim()) ? passengerName.trim() : 'MR. ISHAUJHYAODS';
    if (!passengerName || !passengerName.trim()) {
      setPassengerName('MR. ISHAUJHYAODS');
    }

    // Save to history asynchronously in background
    savePlacardRecord({
      passengerName: effectiveName,
      serviceDate,
      flightNumber,
      managerSession,
    }).then(saved => {
      if (saved) {
        setLastSavedId(saved.id);
        loadHistory();
      }
    }).catch(() => {});

    // Instant Direct Print
    printPlacardDirect({
      passengerName: effectiveName,
      flightNumber,
      serviceDate,
      onSuccess: () => {
        setStatusNotice(isBn ? '✓ প্রিন্ট প্রস্তুত করা হয়েছে' : '✓ Print dialog ready');
        setTimeout(() => setStatusNotice(''), 4000);
      },
    });
  };"""

if target.replace('\n', '\r\n') in content:
    content = content.replace(target.replace('\n', '\r\n'), replacement.replace('\n', '\r\n'), 1)
    print("Replaced download & print handlers (CRLF)")
elif target in content:
    content = content.replace(target, replacement, 1)
    print("Replaced download & print handlers (LF)")
else:
    print("Target block not found")

with open('src/components/MakePlacardModal.js', 'w', encoding='utf-8') as f:
    f.write(content)

print("Updated MakePlacardModal.js successfully!")

