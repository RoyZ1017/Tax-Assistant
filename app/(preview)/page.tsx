"use client";

import {
  AttachmentIcon,
  BotIcon,
  UserIcon,
} from "@/components/icons";
import { useChat } from "ai/react";
import React, { useEffect, useRef, useState } from "react"; 
import { motion } from "framer-motion";
import { toast } from "sonner";
import { Markdown } from "@/components/markdown";

// Define the Attachment interface
interface Attachment {
  url: string;
  name: string;
  contentType?: string;
  file?: File;  // Allow file to be attached for PDFs
  uploaded?: boolean; // Add the uploaded property to track file upload status
}

const getTextFromDataUrl = (dataUrl: string) => {
  const base64 = dataUrl.split(",")[1];
  return window.atob(base64);
};

export default function Home() {
  const { messages, input, handleSubmit, handleInputChange, isLoading, setMessages } =
    useChat({
      onError: () =>
        toast.error("You've been rate limited, please try again later!"),
    });

  const [files, setFiles] = useState<File[]>([]); // Change state to store an array of files
  const inputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null); // Reference for the hidden file input

  const handlePaste = (event: React.ClipboardEvent) => {
    const items = event.clipboardData?.items;

    if (items) {
      const files = Array.from(items)
        .map((item) => item.getAsFile())
        .filter((file): file is File => file !== null);

      if (files.length > 0) {
        const validFiles = files.filter(
          (file) =>
            file.type.startsWith("image/") ||
            file.type.startsWith("text/") ||
            file.type === "application/pdf"  // Allow PDF files
        );

        if (validFiles.length === files.length) {
          setFiles((prevFiles) => [...prevFiles, ...validFiles]); // Append valid files to the existing ones
        } else {
          toast.error("Only image, text, and PDF files are allowed");
        }
      }
    }
  };

  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    // Scroll to the bottom whenever a new message is added
    scrollToBottom();

    // Add the default message if the messages array is empty (initial load)
    if (messages.length === 0) {
      setMessages([ 
        ...messages,
        { role: "assistant", content: "Hi, I'm Cotax, and I'll be your personal tax assistant today!", id:""},
      ]);
    }
  }, [messages, setMessages]);

  // Function to handle file selection via the upload button
  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  // Function to handle files selected from the file dialog
  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = event.target.files;
    if (selectedFiles) {
      const validFiles = Array.from(selectedFiles).filter(
        (file) =>
          file.type.startsWith("image/") ||
          file.type.startsWith("text/") ||
          file.type === "application/pdf"  // Allow PDF files
      );

      if (validFiles.length === selectedFiles.length) {
        setFiles((prevFiles) => [...prevFiles, ...validFiles]); // Append valid files to the existing ones
      } else {
        toast.error("Only image, text, and PDF files are allowed");
      }
    }
  };

  // Function to remove a file from the list
  const removeFile = (fileToRemove: File) => {
    setFiles((prevFiles) =>
      prevFiles.filter((file) => file.name !== fileToRemove.name)
    );

    // Reset the file input ref to allow re-attachment of the same file
    fileInputRef.current!.value = ""; // Clear the file input value to enable re-selection
  };

  // Function to transform files into Attachment objects
  const transformFilesToAttachments = async (files: File[]): Promise<Attachment[]> => {
    const attachments: Attachment[] = [];

    for (const file of files) {
      // Check if the file is an image, text, or PDF
      if (file.type.startsWith("image/") || file.type.startsWith("text/") || file.type === "application/pdf") {
        const fileUrl = await convertFileToBase64(file); // Convert file to base64
        attachments.push({
          url: fileUrl, // Store base64 data
          name: file.name,
          contentType: file.type,
          file,  // Store the original file object
          uploaded: false, // Initial state of uploaded is false
        });
      }
    }

    return attachments;
  };

  // Helper function to convert file to base64
  const convertFileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        resolve(reader.result as string);
      };
      reader.onerror = reject;
      reader.readAsDataURL(file); // Convert file to base64
    });
  };

  const handleGenerateTable = () => {
    handleQuickReply("Generate a markdown table");
  };

  const handleQuickReply = (reply: string) => {
    // Create a synthetic event for handleInputChange
    const inputEvent = { target: { value: reply } } as React.ChangeEvent<HTMLInputElement>;
    
    // Update the input value with the selected quick reply
    handleInputChange(inputEvent);
    if (input.trim() != ""){
      const formEvent = { preventDefault: () => {}, target: {} } as React.FormEvent;
      handleFormSubmit(formEvent);
    }
  };

  const handleFormSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    // If there are attachments but no input text, show an error toast
    if (input.trim() === "") {
      toast.error("Please provide text instructions along with your image.");
      return;
    }

    const modifiedInput = input.trim() === "" ? " " : input; // Ensure input is not empty

    const attachments = await transformFilesToAttachments(files); // Transform files into Attachment objects
    const options = attachments.length > 0 ? { experimental_attachments: attachments, input: modifiedInput } : { input: modifiedInput };

    handleSubmit(event, options);
    setFiles([]); // Clear files after sending

    // Reset the file input field to allow the same file to be selected again
    fileInputRef.current!.value = ""; // Reset the input field value
  };

  return (
    <div className="flex justify-center items-center w-full h-screen bg-white dark:bg-zinc-900">
      <title>Cotax.AI</title>
      <div className="flex flex-col w-full h-full bg-white dark:bg-zinc-800 rounded-lg shadow-lg p-4">
        <div className="flex flex-col gap-2 p-4 flex-1 overflow-y-auto scrollbar-hidden">
          {messages.length > 0 ? (
            <div className="flex flex-col gap-2 w-3/5 mx-auto items-center">
              {messages.map((message, index) => (
                <motion.div
                  key={message.id}
                  className={`flex flex-row gap-2 w-full ${message.role === "assistant" ? "justify-start" : "justify-end"}`}
                  initial={{ y: 5, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                >
                  <div className="size-[24px] flex flex-col justify-center items-center flex-shrink-0 text-zinc-400">
                    {message.role === "assistant" ? <BotIcon /> : <UserIcon />}
                  </div>
  
                  <div className="flex flex-col gap-1 max-w-[80%] p-3 rounded-lg bg-gray-200 dark:bg-gray-700 text-black dark:text-white mb-2">
                    <Markdown>{message.content}</Markdown>
  
                    {/* Handle images and PDFs inside the message bubble */}
                    <div className="flex flex-row gap-2">
                      {message.experimental_attachments?.map((attachment) =>
                        attachment.contentType?.startsWith("image") ? (
                          <div className="flex flex-col gap-2" key={attachment.name}>
                            <img
                              className="rounded-md h-auto mb-3"
                              src={attachment.url}
                              alt={attachment.name}
                            />
                          </div>
                        ) : attachment.contentType?.startsWith("text") ? (
                          <div className="text-xs w-40 h-24 overflow-hidden text-zinc-400 border p-2 rounded-md dark:bg-zinc-800 dark:border-zinc-700 mb-3">
                            {getTextFromDataUrl(attachment.url)}
                          </div>
                        ) : attachment.contentType?.startsWith("application/pdf") ? (
                          <div key={attachment.name} className="relative">
                            <embed
                              src={attachment.url}
                              type="application/pdf"
                              width="100%"
                              height="100px"
                              className="rounded-md"
                            />
                          </div>
                        ) : null
                      )}
                    </div>
                  </div>
                </motion.div>
              ))}
  
              {isLoading && messages[messages.length - 1].role !== "assistant" && (
                <div className="flex flex-row gap-2 px-4 w-full md:w-[500px] md:px-0">
                  <div className="size-[24px] flex flex-col justify-center items-center flex-shrink-0 text-zinc-400">
                    <BotIcon />
                  </div>
                  <div className="flex flex-col gap-1 text-zinc-400">
                    <div>hmm...</div>
                  </div>
                </div>
              )}
  
              <div ref={messagesEndRef} />
            </div>
          ) : (
            <motion.div className="h-[350px] px-4 w-full md:w-[500px] md:px-0 pt-20"></motion.div>
          )}
        </div>
  
        {/* Attachments Positioned Above Quick Reply Buttons and Stacked Side by Side */}
        <div className="flex flex-row gap-4 mb-4 w-full md:w-[500px] px-4 mx-auto z-20 justify-center">
          {files.length > 0 &&
            files.map((file) => (
              <div key={file.name} className="relative w-[120px]">
                {file.type === "application/pdf" ? (
                  <div className="w-full h-auto bg-zinc-200 dark:bg-zinc-700 rounded-md flex flex-col items-start mx-auto relative p-2">
                    <span className="text-xs text-zinc-600 dark:text-zinc-300 mb-2">{file.name}</span>
                    <span className="text-xs text-zinc-600 dark:text-zinc-300">PDF File</span>
                    <button
                      type="button"
                      className="absolute top-0 right-0 bg-white text-gray-700 hover:text-gray-900 rounded-full p-1 opacity-75 hover:opacity-100 transition duration-150"
                      onClick={() => removeFile(file)}
                    >
                      ✖
                    </button>
                  </div>
                ) : (
                  <motion.div className="relative mx-auto">
                    <motion.img
                      src={URL.createObjectURL(file)}
                      alt={file.name}
                      className="rounded-md w-[100px] mb-2" // Small preview size when attaching
                      initial={{ scale: 0.8, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      exit={{
                        y: -10,
                        scale: 1.1,
                        opacity: 0,
                        transition: { duration: 0.2 },
                      }}
                    />
                    <button
                      type="button"
                      className="absolute top-0 right-0 bg-white text-gray-700 hover:text-gray-900 rounded-full p-1 opacity-75 hover:opacity-100 transition duration-150"
                      onClick={() => removeFile(file)}
                    >
                      ✖
                    </button>
                  </motion.div>
                )}
              </div>
            ))}
        </div>
  
        {/* Quick Replies (Centered and Outside the AI bubble) */}
        <div className="flex justify-center gap-4 mb-10 relative z-0">
          <button
            onClick={() => handleQuickReply("Sure, tell me more about it!")}
            className="text-gray-500 hover:underline bg-transparent focus:outline-none z-10"
          >
            Sure, tell me more!
          </button>
          <button
            onClick={() => handleQuickReply("Give me a quick summary")}
            className="text-gray-500 hover:underline bg-transparent focus:outline-none z-10"
          >
            Give me a quick summary
          </button>
          <button
            onClick={() => handleQuickReply("How do tax brackets work?")}
            className="text-gray-500 hover:underline bg-transparent focus:outline-none z-10"
          >
            How do tax brackets work?
          </button>
          <button
            onClick={() => handleQuickReply("Tell me about deductions")}
            className="text-gray-500 hover:underline bg-transparent focus:outline-none z-10"
          >
            Tell me about deductions
          </button>
        </div>
  
        {/* Message Input */}
        <form
          className="flex flex-col gap-2 relative items-center h-fit md:-mt-6"
          onSubmit={handleFormSubmit}
        >
          {/* Hidden file input */}
          <input
            type="file"
            multiple
            accept="image/*,text/*,application/pdf"
            ref={fileInputRef}
            className="hidden"
            onChange={handleFileChange}
          />
  
          {/* Input Box */}
          <div className="flex items-center w-full md:max-w-[800px] max-w-full bg-zinc-100 dark:bg-zinc-700 rounded-full px-4 py-2">
            <button
              type="button"
              onClick={handleUploadClick}
              className="text-zinc-500 dark:text-zinc-300 hover:text-zinc-700 dark:hover:text-zinc-100 focus:outline-none mr-3"
              aria-label="Upload Files"
            >
              <span className="w-5 h-5">
                <AttachmentIcon aria-hidden="true" />
              </span>
            </button>
  
            <input
              ref={inputRef}
              className="bg-transparent flex-grow outline-none text-zinc-800 dark:text-zinc-300 placeholder-zinc-400"
              placeholder="Send a message..."
              value={input}
              onChange={handleInputChange}
              onPaste={handlePaste}
            />
            <button
              type="button"
              onClick={handleGenerateTable}
              className="text-gray-500 hover:underline bg-transparent focus:outline-none ml-4"
            >
              Generate Table
            </button>
          </div>
        </form>
      </div>
    </div>
  );  
}
